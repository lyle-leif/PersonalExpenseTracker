import { FX_PAIR, FX_HOUR, FX_MINUTE, preferFxSnapshot, validateFxSnapshot } from './fx-core.mjs';

export function createFxDeviceStore({ indexedDB: idb = globalThis.indexedDB, name = 'monix-reference-rates-v1' } = {}) {
  let connection;
  async function open() {
    if (!idb) throw Error('Device storage is unavailable. Your saved rate was not replaced.');
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = idb.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('reference');
      request.onerror = () => { connection = null; reject(request.error); };
      request.onblocked = () => { connection = null; reject(Error('Close older Monix tabs, then retry.')); };
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = null; }; resolve(request.result); };
    });
    return connection;
  }
  async function transaction(write, mutate) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reference', write ? 'readwrite' : 'readonly'), store = tx.objectStore('reference');
      let result, failure;
      const read = store.get(FX_PAIR);
      read.onsuccess = () => {
        try { result = mutate(read.result || { snapshot: null, meta: {} }, store); }
        catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => {};
      tx.onabort = () => reject(failure || Error(tx.error?.name === 'QuotaExceededError' ? 'Device storage is full. Your saved rate was retained.' : 'Could not save the reference rate on this device. Your saved rate was retained.'));
    });
  }
  return {
    async read() { return transaction(false, row => structuredClone(row)); },
    async save(snapshot, now = Date.now()) {
      return transaction(true, (row, store) => {
        const next = preferFxSnapshot(row.snapshot, snapshot, now);
        store.put({ ...row, snapshot: next }, FX_PAIR);
        return next;
      });
    },
    async claim(token, now, force) {
      return transaction(true, (row, store) => {
        const meta = row.meta;
        if ((meta.leaseUntil || 0) > now || (meta.manualUntil || 0) > now || (!force && (meta.nextAutoAt || 0) > now)) return false;
        store.put({ ...row, meta: { ...meta, token, leaseUntil: now + 20_000, manualUntil: now + FX_MINUTE } }, FX_PAIR);
        return true;
      });
    },
    async finish(token, { now, failed, retryAfterMs = 0, refreshing = false }) {
      return transaction(true, (row, store) => {
        if (row.meta.token !== token) return row;
        const failures = failed ? (row.meta.failures || 0) + 1 : 0;
        const backoff = [FX_MINUTE, 5 * FX_MINUTE, 15 * FX_MINUTE, FX_HOUR][Math.min(3, failures - 1)];
        const nextAutoAt = failed ? now + Math.max(backoff, retryAfterMs) : refreshing ? now + Math.max(1000, retryAfterMs) : row.snapshot ? Math.max(now + 1000, Date.parse(row.snapshot.checkedAt) + FX_HOUR) : now + FX_MINUTE;
        const updated = { ...row, meta: { ...row.meta, leaseUntil: 0, token: null, failures, nextAutoAt } };
        store.put(updated, FX_PAIR);
        return updated;
      });
    }
  };
}

export function createFxController({ store = createFxDeviceStore(), fetcher = fetch, clock = Date.now, online = () => navigator.onLine, visible = () => !document.hidden, notify = () => {}, endpoint = '/api/fx/cad-php', channelFactory = () => typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('monix-reference-rates'), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let state = { snapshot: null, updating: false, online: online(), error: '', refreshing: false }, disposed = false, running = false, timer = null, aborter = null;
  const channel = channelFactory();
  const emit = () => { if (!disposed) notify({ ...state, online: online() }); };
  const schedule = async () => {
    clearTimer(timer); timer = null;
    if (disposed || !online() || !visible()) return;
    try {
      const row = await store.read(), now = clock();
      if (disposed || !online() || !visible()) return;
      const freshAt = row.snapshot ? Date.parse(row.snapshot.checkedAt) + FX_HOUR : now;
      const next = Math.max(row.meta.nextAutoAt || 0, row.meta.manualUntil || 0, row.meta.leaseUntil || 0, freshAt);
      timer = setTimer(() => { void refresh(false); }, Math.max(1000, next - now));
    } catch { /* The original error is presented by start/refresh; no retry loop without storage. */ }
  };
  async function refresh(force = false) {
    if (disposed || running || !visible()) return;
    state.online = online();
    if (!online()) { state.updating = false; emit(); clearTimer(timer); return; }
    const token = crypto.randomUUID(), now = clock();
    let claimed = false, failed = false, retryAfterMs = 0, refreshing = false;
    running = true;
    try {
      const row = await store.read();
      if (!force && row.snapshot && now - Date.parse(row.snapshot.checkedAt) < FX_HOUR) return;
      state.cooldownUntil = row.meta.manualUntil || 0;
      claimed = await store.claim(token, now, force);
      if (!claimed) {
        if (force) { state.error = 'Please wait one minute between rate updates, or let the current update finish.'; emit(); }
        return;
      }
      state.cooldownUntil = now + FX_MINUTE;
      state.updating = true; state.error = ''; emit();
      aborter = new AbortController();
      const timeout = setTimer(() => aborter?.abort(), 13_000);
      let response;
      try { response = await fetcher(endpoint + (force ? '?refresh=1' : ''), { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: aborter.signal }); }
      finally { clearTimer(timeout); }
      if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? 'Sign in with an approved account to update rates. Your saved rate is still available.' : 'The rate service is unavailable. Try again later.');
      const body = await response.json();
      retryAfterMs = Math.min(FX_HOUR, Math.max(0, Number(body.retryAfterMs) || 0)); refreshing = body.refreshing === true;
      if (body.snapshot) {
        const candidate = validateFxSnapshot(body.snapshot, clock());
        state.snapshot = await store.save(candidate, clock()); // no success until this transaction commits
        channel?.postMessage({ pair: FX_PAIR });
      } else if (!refreshing && !body.refreshError) throw Error('No reference rate was returned.');
      if (body.refreshError) throw Error('Couldn’t check the reference service. Your saved rate was retained.');
      state.refreshing = refreshing;
      if (!state.snapshot && refreshing) state.error = 'Another rate check is finishing. Monix will retry shortly.';
    } catch (error) {
      failed = true;
      state.error = error?.name === 'AbortError' ? 'The rate request timed out. Your saved rate was retained.' : error?.name === 'SyntaxError' ? 'The rate service returned an invalid response. Your saved rate was retained.' : error?.message || 'Couldn’t update the reference rate.';
    } finally {
      if (claimed) { try { await store.finish(token, { now: clock(), failed, retryAfterMs, refreshing }); } catch { state.error = 'Could not finish saving on this device. Your previous saved rate remains available.'; } }
      running = false; state.updating = false; emit(); void schedule();
    }
  }
  async function reload() {
    try { const row = await store.read(); state.snapshot = row.snapshot ? validateFxSnapshot(row.snapshot, clock()) : null; }
    catch (error) { state.error = error?.message || 'Could not read device storage.'; }
    emit();
  }
  if (channel) channel.onmessage = () => { void reload(); };
  return {
    async start() { await reload(); if (!disposed) await refresh(false); },
    refresh,
    async environmentChanged() { state.online = online(); emit(); if (!visible() || !online()) { clearTimer(timer); return; } await reload(); await refresh(false); },
    state: () => ({ ...state, online: online() }),
    destroy() { disposed = true; clearTimer(timer); aborter?.abort(); channel?.close(); }
  };
}
