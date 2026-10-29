# CAD/PHP reference converter — staged implementation

The code and review implement a reference calculator, not mixed-currency accounting. Ledger calculations, current PHP records, backup formats, owner IDs, and the financial sync queue are unchanged. The live Site has not been updated.

## Interfaces

`app/fx-core.mjs` validates snapshots and performs exact arithmetic. A snapshot contains `base: CAD`, `quote: PHP`, `provider: ECB`, `source: Frankfurter/ECB`, a positive decimal-string `rate` (PHP per CAD), `publicationDate` (ISO calendar date), and `checkedAt` (UTC timestamp). Reverse conversions divide by the same canonical rate. Amounts/results are limited to 1,000,000,000,000 minor units and round half-up only once at the final cent.

`app/fx-service.mjs` exposes an injectable service and authorization-aware response helper. `GET /api/fx/cad-php` returns `{snapshot, refreshError, refreshing, retryAfterMs}`. Only `?refresh=1` is supported; amounts and alternate currencies are rejected. Auth and API responses are private/no-store. The upstream URL is fixed to Frankfurter's ECB-provider CAD/PHP endpoint, never a user-supplied URL. Provider cookies and user data are not forwarded.

`drizzle/0001_reference_fx.sql` adds a separate singleton public-reference cache. D1 compare-and-set leases deduplicate refreshes across isolates. Successful checks retain the publication date when the daily observation is unchanged. Failures cannot erase or downgrade a valid cached observation. This migration is staged, not applied live.

`app/fx-device.mjs` uses the separate `monix-reference-rates-v1` IndexedDB database. Its controller emits state and exposes `start`, `refresh`, `environmentChanged`, and `destroy`. Connect lifecycle events for reconnect/visibility, use the workspace currency as the input default, and clear entered amounts when the owner changes or signs out. Do not store converter amounts or insert them into financial commands.

The model's existing maximum financial amount and integer-cent calculations are reused conceptually but never mutated by FX code. The source price is a daily informational reference, not a bank quote or guaranteed transfer rate.

## Integration and release gates

1. Obtain approval for Proposal 04's light/dark phone converter and the previous Monix screen direction.
2. Integrate the screen and companion/More shortcuts into the approved Monix interface; bundle its modules in the existing offline shell.
3. Complete the planned standalone Firebase Spark / Workers Free / D1 Free authentication migration. Replace the staged `getChatGPTUser` authorization adapter with verified approved Monix membership; test pending/suspended users and forged owner IDs. Do not leave ChatGPT sign-in in the new release.
4. Complete CAD setup, confirmed timezone handling, and the backed-up owner mapping/migration. The converter alone does not make the existing financial model support CAD workspaces.
5. Resolve the remaining full build-tool dependency advisories before deployment. Production-only audit currently has no known advisories, but some framework/dev packages are bundled into runtime and need separate clearance. Do not force an automated dependency downgrade to silence an advisory.
6. Apply the schema migration and deploy only after approval/security checks. Preserve private access until the new application-level membership controls have been verified. Validate the owner's PHP records before any invitation.

## Checks

`npm test` runs the 78 tests, including `tests/fx.test.mjs`. Coverage includes exact/inverse arithmetic, malicious/invalid responses, D1 lease races/cooldowns, unchanged publications, stale observations, endpoint authorization/privacy, persistent IndexedDB writes, failed writes, timeouts/backoff, visibility/reconnect, cross-tab coordination, and no changes to either owner's financial queue. `npm run typecheck` and `npm run build` pass.

The local review uses the same core/device/service code with a loopback-only public-data server, not real user authentication. Its offline/failure controls are explicitly simulations. A real server-stopped reopening was verified. Physical-device airplane mode, Safari/Android behavior, deployed D1 quotas, and full post-auth-migration regression remain final-release checks.
