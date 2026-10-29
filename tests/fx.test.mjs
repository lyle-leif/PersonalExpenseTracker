import 'fake-indexeddb/auto';
import { IDBObjectStore } from 'fake-indexeddb';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { FX_PAIR, FX_SOURCE_URL, FX_HOUR, fromEcbResponse, validateFxSnapshot, preferFxSnapshot, parseFxAmount, convertFxAmount, formatFxMinor, fxIsOld, fxStatus } from '../app/fx-core.mjs';
import { createFxService, d1FxStore, fxResponse } from '../app/fx-service.mjs';
import { createFxDeviceStore, createFxController } from '../app/fx-device.mjs';
import { acceptRemote, readDevice, saveOnDevice } from '../app/offline-db.mjs';
import { initialData } from '../app/model.mjs';

const NOW = Date.parse('2026-10-29T12:00:00Z');
const raw = { base: 'CAD', quote: 'PHP', rate: 45.556, date: '2026-10-28' };
const snap = (overrides = {}) => ({ ...fromEcbResponse(raw, NOW), ...overrides });
const response = (payload, status = 200) => Response.json(payload, { status });
const freshStore = () => createFxDeviceStore({ name: 'fx-test-' + crypto.randomUUID() });
function sqlStore() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../drizzle/0001_reference_fx.sql', import.meta.url), 'utf8'));
  const db = { prepare(query) { const stmt = sql.prepare(query); return { bind(...args) { return { async first() { return stmt.get(...args) || null; }, async run() { return { meta: { changes: Number(stmt.run(...args).changes) } }; } }; } }; } };
  return { db, store: d1FxStore(db), sql };
}
function client(store, extra = {}) {
  const events = [], timers = new Map(); let timerId = 0;
  const controller = createFxController({ store, clock: () => NOW, online: () => true, visible: () => true, channelFactory: () => null, notify: state => events.push(state), setTimer: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimer: id => timers.delete(id), ...extra });
  return { controller, events, timers };
}

test('conversion uses decimal integers and rounds only at the final cent', () => {
  assert.equal(parseFxAmount('0'), 0n);
  assert.equal(convertFxAmount('100', 'CAD', snap()).minor, '455560');
  assert.equal(convertFxAmount('4555.60', 'PHP', snap()).minor, '10000');
  assert.equal(convertFxAmount('0.01', 'CAD', snap({ rate: '1.5' })).minor, '2');
  assert.equal(convertFxAmount('0.01', 'PHP', snap({ rate: '2' })).minor, '1');
  assert.equal(convertFxAmount('1', 'CAD', snap({ rate: '1.234999999999999999' })).minor, '123');
  assert.equal(convertFxAmount('1', 'CAD', snap({ rate: '1.235000000000000001' })).minor, '124');
  assert.equal(formatFxMinor('123456789', 'CAD'), 'CA$1,234,567.89');
  assert.equal(formatFxMinor('0', 'PHP'), '₱0.00');
  for (const value of ['-1', '1.001', 'Infinity', 'NaN', '1e3', '', '1,000', '10000000000.01']) assert.throws(() => parseFxAmount(value));
  assert.throws(() => convertFxAmount('10000000000', 'CAD', snap()), /limit/);
});

test('rate validation rejects incorrect sources, currencies, dates, and unsafe rates', () => {
  assert.equal(fromEcbResponse(raw, NOW).rate, '45.556');
  assert.throws(() => fromEcbResponse({ ...raw, provider: 'OTHER' }, NOW));
  for (const bad of [{ provider: 'OTHER' }, { base: 'USD' }, { quote: 'CAD' }, { rate: '0' }, { rate: '-2' }, { rate: 'Infinity' }, { rate: '1e2' }, { rate: '0.0000000000000000001' }, { publicationDate: '2026-02-30' }, { publicationDate: '2026-10-30' }, { checkedAt: 'never' }]) assert.throws(() => validateFxSnapshot(snap(bad), NOW));
  assert.throws(() => preferFxSnapshot(snap(), snap({ publicationDate: '2026-10-27' }), NOW), /older/);
  const later = snap({ checkedAt: new Date(NOW + 1000).toISOString() });
  assert.deepEqual(preferFxSnapshot(later, snap(), NOW), later);
  assert.equal(fxIsOld(snap({ publicationDate: '2026-10-21' }), NOW), true);
  assert.equal(fxIsOld(snap({ publicationDate: '2026-10-22' }), NOW), false);
  assert.equal(fxStatus({ snapshot: null, online: false }), 'Connect once to download a rate');
  assert.equal(fxStatus({ snapshot: snap(), online: false }), 'Offline · using saved rate');
});

test('D1 cache uses only the fixed ECB endpoint and shares one result across users', async () => {
  const { store, sql } = sqlStore(); let calls = 0;
  const service = createFxService({ store, clock: () => NOW, fetcher: async (url, options) => { calls++; assert.equal(url, FX_SOURCE_URL); assert.deepEqual(options.headers, { Accept: 'application/json' }); return response(raw); } });
  const first = await service.load(); assert.equal(first.snapshot.rate, '45.556');
  assert.deepEqual((await service.load()).snapshot, first.snapshot); assert.equal(calls, 1);
  const secondService = createFxService({ store, clock: () => NOW, fetcher: () => { throw Error('Must not refetch'); } });
  assert.deepEqual((await secondService.load()).snapshot, first.snapshot);
  assert.equal((await store.read()).snapshot.publicationDate, '2026-10-28'); sql.close();
});

test('concurrent requests and separate server isolates cannot duplicate a provider refresh', async () => {
  const { store } = sqlStore(); let calls = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const fetcher = async () => { calls++; await gate; return response(raw); };
  const a = createFxService({ store, clock: () => NOW, fetcher });
  const b = createFxService({ store, clock: () => NOW, fetcher });
  const pending = a.load();
  await new Promise(resolve => setImmediate(resolve));
  const waiting = await b.load(); assert.equal(waiting.refreshing, true); assert.equal(waiting.snapshot, null);
  release(); assert.equal((await pending).snapshot.rate, '45.556'); assert.equal(calls, 1);
});

test('server failures, malformed data, and older observations retain the last valid rate', async () => {
  for (const payload of [null, { ...raw, date: '2026-10-27' }, { ...raw, base: 'USD' }, { ...raw, rate: 0 }, { ...raw, date: '2027-01-01' }]) {
    const { store } = sqlStore(); await store.claim('seed', NOW, true); await store.commit('seed', snap());
    const service = createFxService({ store, clock: () => NOW + FX_HOUR + 1, fetcher: async () => payload ? response(payload) : response({}, 429) });
    const result = await service.load(); assert.equal(result.refreshError, true); assert.deepEqual(result.snapshot, snap());
  }
});

test('unchanged publication dates update only successful check metadata', async () => {
  const { store } = sqlStore(); await store.claim('seed', NOW, true); await store.commit('seed', snap());
  const later = NOW + FX_HOUR + 1;
  const result = await createFxService({ store, clock: () => later, fetcher: async () => response(raw) }).load();
  assert.equal(result.snapshot.publicationDate, '2026-10-28');
  assert.equal(result.snapshot.checkedAt, new Date(later).toISOString());
});

test('manual cooldown, failed-provider cooldown, and expired lease tokens are enforced', async () => {
  const { store } = sqlStore(); assert.equal(await store.claim('old', NOW, true), true);
  assert.equal(await store.claim('too-soon', NOW + 59_999, true), false);
  assert.equal(await store.claim('new', NOW + 60_001, true), true);
  assert.equal(await store.commit('old', snap()), false);
  await store.fail('old'); assert.equal((await store.read()).leaseUntil, NOW + 75_001);
  assert.equal(await store.commit('new', snap({ checkedAt: new Date(NOW + 60_001).toISOString() })), true);
});

test('endpoint checks authorization before fetch and rejects entered amounts or alternate pairs', async () => {
  let calls = 0; const service = { load: async () => { calls++; return { snapshot: snap() }; } };
  const url = 'https://monix.test/api/fx/cad-php';
  assert.equal((await fxResponse(new Request(url), { authorize: async () => false, service })).status, 401);
  for (const query of ['?amount=500', '?base=USD', '?refresh=no']) assert.equal((await fxResponse(new Request(url + query), { authorize: async () => true, service })).status, 400);
  assert.equal(calls, 0);
  const result = await fxResponse(new Request(url), { authorize: async () => true, service }); assert.equal(result.status, 200); assert.equal(result.headers.get('Cache-Control'), 'private, no-store'); assert.equal(calls, 1);
  assert.equal((await fxResponse(new Request(url), { authorize: async () => true, service: { load: () => { throw Error('Quota'); } } })).status, 503);
});

test('IndexedDB survives reopen and rejects invalid or older replacements atomically', async () => {
  const name = 'fx-reopen-' + crypto.randomUUID(), store = createFxDeviceStore({ name });
  await store.save(snap(), NOW);
  assert.deepEqual((await createFxDeviceStore({ name }).read()).snapshot, snap());
  await assert.rejects(() => store.save(snap({ publicationDate: '2026-10-27' }), NOW), /older/);
  await assert.rejects(() => store.save(snap({ rate: '0' }), NOW));
  assert.deepEqual((await store.read()).snapshot, snap());
});

test('failed local write retains the previous rate and never reports the uncommitted replacement', async () => {
  const store = freshStore(); await store.save(snap(), NOW);
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () { throw new DOMException('Full', 'QuotaExceededError'); };
  try { await assert.rejects(() => store.save(snap({ rate: '99' }), NOW)); }
  finally { IDBObjectStore.prototype.put = original; }
  assert.equal((await store.read()).snapshot.rate, '45.556');
  const device = client(store, { fetcher: async () => response({ snapshot: snap({ rate: '99' }) }) });
  await device.controller.start();
  const save = store.save; store.save = async () => { throw Error('Full'); };
  await device.controller.refresh(true); assert.equal(device.controller.state().snapshot.rate, '45.556'); assert.match(device.controller.state().error, /Full/);
  store.save = save; device.controller.destroy();
});

test('client offline first use never fabricates a rate; saved rate works without fetching', async () => {
  let calls = 0; const fetcher = async () => { calls++; throw Error('Unexpected request'); };
  const empty = client(freshStore(), { online: () => false, fetcher }); await empty.controller.start(); assert.equal(empty.controller.state().snapshot, null); empty.controller.destroy();
  const store = freshStore(); await store.save(snap(), NOW);
  const saved = client(store, { online: () => false, fetcher }); await saved.controller.start(); assert.equal(convertFxAmount('100', 'CAD', saved.controller.state().snapshot).minor, '455560'); saved.controller.destroy(); assert.equal(calls, 0);
});

test('timeouts keep the committed rate and release refresh coordination', async () => {
  const store = freshStore(); await store.save(snap(), NOW);
  const device = client(store, { clock: () => NOW + FX_HOUR + 1, fetcher: async () => { throw new DOMException('Timed out', 'AbortError'); } });
  await device.controller.start();
  assert.equal(device.controller.state().snapshot.rate, '45.556');
  assert.match(device.controller.state().error, /timed out/);
  assert.equal((await store.read()).meta.leaseUntil, 0);
  device.controller.destroy();
});

test('client freshness, backoff, visibility, reconnect, cooldown, and teardown', async () => {
  let now = NOW, isOnline = true, isVisible = true, calls = 0, broken = true;
  const store = freshStore(); const device = client(store, { clock: () => now, online: () => isOnline, visible: () => isVisible, fetcher: async () => { calls++; return broken ? response({}, 503) : response({ snapshot: snap({ checkedAt: new Date(now).toISOString() }) }); } });
  await device.controller.start(); assert.equal(calls, 1);
  assert.equal((await store.read()).meta.nextAutoAt, now + 60_000);
  await device.controller.environmentChanged(); assert.equal(calls, 1);
  now += 60_001; await device.controller.environmentChanged(); assert.equal(calls, 2); assert.equal((await store.read()).meta.nextAutoAt, now + 300_000);
  isVisible = false; now += 300_001; await device.controller.environmentChanged(); assert.equal(calls, 2);
  isVisible = true; isOnline = false; await device.controller.environmentChanged(); assert.equal(calls, 2);
  isOnline = true; broken = false; await device.controller.environmentChanged(); assert.equal(calls, 3); assert.equal(device.controller.state().snapshot.rate, '45.556');
  await device.controller.refresh(true); assert.equal(calls, 3);
  now += 60_001; await device.controller.refresh(true); assert.equal(calls, 4);
  device.controller.destroy(); await device.controller.refresh(true); assert.equal(calls, 4);
});

test('separate tabs share an atomic refresh lease', async () => {
  const name = 'fx-tabs-' + crypto.randomUUID(), a = createFxDeviceStore({ name }), b = createFxDeviceStore({ name });
  const claims = await Promise.all([a.claim('a', NOW, true), b.claim('b', NOW, true)]);
  assert.equal(claims.filter(Boolean).length, 1);
});

test('a cached server response does not postpone freshness checks by another full hour', async () => {
  const store = freshStore();
  const checkedAt = NOW - 50 * 60_000;
  const device = client(store, { fetcher: async () => response({ snapshot: snap({ checkedAt: new Date(checkedAt).toISOString() }) }) });
  await device.controller.start();
  assert.equal((await store.read()).meta.nextAutoAt, checkedAt + FX_HOUR);
  device.controller.destroy();
});

test('reference operations cannot change either owner’s ledger or financial queue', async () => {
  await acceptRemote({ ownerId: 'fx-alice', name: 'Alice', data: initialData(), version: 0, appliedIds: [] });
  await acceptRemote({ ownerId: 'fx-bob', name: 'Bob', data: initialData(), version: 0, appliedIds: [] });
  await saveOnDevice('fx-alice', 'settings', { businessName: 'Alice business' }, 'pending-alice');
  const alice = await readDevice('fx-alice'), bob = await readDevice('fx-bob');
  const store = freshStore(); await store.save(snap(), NOW); convertFxAmount('100', 'CAD', (await store.read()).snapshot);
  assert.deepEqual(await readDevice('fx-alice'), alice); assert.deepEqual(await readDevice('fx-bob'), bob);
  assert.equal((await store.read()).snapshot.provider, 'ECB');
});
