import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { createFxService, d1FxStore, fxResponse } from '../../../fx-service.mjs';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  // Staged adapter for the existing owner-private Site. Replace this trusted
  // identity boundary with approved Monix membership during the auth migration.
  // This does not create a second username/password gate on the private Site.
  const service = createFxService({ store: d1FxStore(env.DB) });
  return fxResponse(request, { authorize: async () => !!await getChatGPTUser(), service });
}
