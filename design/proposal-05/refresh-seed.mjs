import { writeFile } from 'node:fs/promises';
import { FX_SOURCE_URL, fromEcbResponse } from './shared/fx-core.mjs';
const result = await fetch(FX_SOURCE_URL, { redirect: 'error', signal: AbortSignal.timeout(12_000), headers: { Accept: 'application/json' } });
if (!result.ok) throw Error('The live rate could not be verified; no replacement seed was written.');
const snapshot = fromEcbResponse(await result.json());
await writeFile(new URL('verified-rate.json', import.meta.url), JSON.stringify(snapshot, null, 2));
console.log('Verified ECB reference published ' + snapshot.publicationDate + '; checked ' + snapshot.checkedAt);
