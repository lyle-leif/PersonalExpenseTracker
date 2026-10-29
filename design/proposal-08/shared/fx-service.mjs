import { FX_PAIR, FX_SOURCE_URL, FX_HOUR, FX_MINUTE, fromEcbResponse, preferFxSnapshot, validateFxSnapshot } from './fx-core.mjs';

export function createFxService({ store, fetcher = fetch, clock = Date.now, token = () => crypto.randomUUID() }) {
  let inFlight = null;
  async function load({ force = false } = {}) {
    const now = clock();
    const current = await store.read();
    const saved = current.snapshot ? validateFxSnapshot(current.snapshot, now) : null;
    if (!force && saved && now - Date.parse(saved.checkedAt) < FX_HOUR) return { snapshot: saved, refreshError: false, refreshing: false, retryAfterMs: 0 };
    if (inFlight) return inFlight;
    const lease = token();
    if (!await store.claim(lease, now, force)) {
      if (inFlight) return inFlight;
      const latest = await store.read();
      return { snapshot: latest.snapshot, refreshError: !!latest.lastError, refreshing: latest.leaseUntil > now, retryAfterMs: Math.max(1_000, (latest.attemptedAt || now) + FX_MINUTE - now) };
    }
    inFlight = (async () => {
      try {
        const response = await fetcher(FX_SOURCE_URL, { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(8_000) });
        if (!response.ok) throw Error('Reference service unavailable.');
        if (Number(response.headers.get('Content-Length') || 0) > 4096) throw Error('Unexpected rate response.');
        const body = await response.text();
        if (body.length > 4096) throw Error('Unexpected rate response.');
        const observed = fromEcbResponse(JSON.parse(body), clock());
        const latest = await store.read();
        const snapshot = preferFxSnapshot(latest.snapshot, observed, clock());
        if (!await store.commit(lease, snapshot)) throw Error('A newer rate check is already in progress.');
        return { snapshot, refreshError: false, refreshing: false, retryAfterMs: FX_MINUTE };
      } catch {
        await store.fail(lease);
        const latest = await store.read();
        return { snapshot: latest.snapshot, refreshError: true, refreshing: false, retryAfterMs: FX_MINUTE };
      } finally { inFlight = null; }
    })();
    return inFlight;
  }
  return { load };
}

export function d1FxStore(db) {
  return {
    async read() {
      const row = await db.prepare('SELECT snapshot, attempted_at, lease_until, last_error FROM fx_reference_cache WHERE pair = ?').bind(FX_PAIR).first();
      return { snapshot: row?.snapshot ? JSON.parse(row.snapshot) : null, attemptedAt: row?.attempted_at || 0, leaseUntil: row?.lease_until || 0, lastError: !!row?.last_error };
    },
    async claim(token, now, force) {
      await db.prepare('INSERT OR IGNORE INTO fx_reference_cache (pair) VALUES (?)').bind(FX_PAIR).run();
      const result = await db.prepare('UPDATE fx_reference_cache SET lease_token = ?, lease_until = ?, attempted_at = ? WHERE pair = ? AND lease_until <= ? AND attempted_at <= ? AND (? = 1 OR checked_at <= ?)').bind(token, now + 15_000, now, FX_PAIR, now, now - FX_MINUTE, force ? 1 : 0, now - FX_HOUR).run();
      return !!result.meta.changes;
    },
    async commit(token, snapshot) {
      const result = await db.prepare('UPDATE fx_reference_cache SET snapshot = ?, checked_at = ?, lease_token = NULL, lease_until = 0, last_error = 0 WHERE pair = ? AND lease_token = ?').bind(JSON.stringify(snapshot), Date.parse(snapshot.checkedAt), FX_PAIR, token).run();
      return !!result.meta.changes;
    },
    async fail(token) { await db.prepare('UPDATE fx_reference_cache SET lease_token = NULL, lease_until = 0, last_error = 1 WHERE pair = ? AND lease_token = ?').bind(FX_PAIR, token).run(); }
  };
}

export async function fxResponse(request, { authorize, service }) {
  // authorize must resolve trusted membership. Never accept an owner/user ID from this URL.
  const approved = await authorize();
  if (!approved) return Response.json({ error: 'Sign in with an approved account to update reference rates.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some(key => key !== 'refresh') || (url.searchParams.has('refresh') && url.searchParams.get('refresh') !== '1')) return Response.json({ error: 'Invalid rate request.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    return Response.json(await service.load({ force: url.searchParams.get('refresh') === '1' }), { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return Response.json({ error: 'Rate service unavailable. Keep using your saved rate, if available.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
