# monix — Personal & Business

A phone-first PHP money tracker for one owner and one business. Personal and business allocations share the same real cash, bank, e-wallet and credit-card balances.

## Run locally

Node 22.13+ is required. The project uses the supplied Sites Vinext starter.

1. Install with the Sites `install-dependencies.mjs` helper (or `npm run install:ci`).
2. Run `npm run db:generate` only after a schema change.
3. Build with the Sites `build-site.mjs` helper (or `npm run build`).
4. Apply the pending SQL from `drizzle/` to local D1 using Wrangler, the generated `dist/server/wrangler.json`, and `.wrangler/state`.
5. Run `npm run dev`. Open its printed loopback URL and use the welcome screen's local sign-in.

Local authentication is simulated only by the development starter. It is excluded from production. Production uses Sites-owned ChatGPT sign-in and private Site access. All API operations resolve the user server-side; clients cannot choose an owner.

## Verify

- `npm test`: monetary model and owner-isolation/storage tests using Node's built-in test runner and SQLite.
- `npm run typecheck`: TypeScript checks.
- `npm run test:integration`: live API checks against the disposable local server at `http://127.0.0.1:5173`. Never point this test at production. It restores the pre-test local data afterward.
- `npm run build`: production build.

## Data and money rules

- Integer centavos, actual calendar dates, and bounded input sizes.
- A single account balance includes both personal and business spending. Transaction allocations sum to the full amount.
- Credit balances are signed: negative is debt, positive is card credit. Purchases reduce the card balance; repayments transfer from another account to the card.
- Transfers, opening balances and balance adjustments do not become income or expenses. Refunds reverse the original expense allocations in the refund month.
- Business bills are separate obligations. Linked payments affect account balances and income/expenses exactly once. Refunds of vendor payments reopen the corresponding payable.
- Card statement/due days provide reminders. They do not calculate the bank's statement balance or minimum payment.
- Workspace entities are stored together in an owner-keyed, versioned D1 document. Each validated command replaces the document atomically. Compare-and-swap versions prevent lost updates. Recorded request IDs make lost-response retries idempotent.
- Full backups contain the financial data, not authentication or request history. CSV emits one row per allocation, escapes quotes and neutralizes leading spreadsheet formulas.

## Hosting and portability

This working implementation uses the existing owner-private Sites project and its D1 binding. No paid service, bank API, SMS service, custom domain, or subscription was enabled. The earlier proposed new Supabase organization was not visible to the connected account, so no Supabase project or Google OAuth client was created. The pure model and storage boundary are separate for a future backend migration.

The PWA manifest and PNG icons allow home-screen installation in supporting browsers. After online setup, IndexedDB stores owner-scoped records and pending changes on the device; a cached identity-neutral shell supports offline reopening. Authentication routes, private server-rendered pages, and financial API responses are never put in the service-worker cache. Changes sync when the app is open and connectivity returns.

## Limits

One owner, one business, PHP only; manual records. Maximum 20,000 transactions and 5 MB per workspace, with up to 50,000 retained action IDs. Exceeding limits shows an error rather than enabling billing. Cloud availability and platform limits remain subject to the hosting provider. Regular JSON exports are recommended.

Browser QA covered desktop and phone layouts, transaction entry/editing, split spending, card setup, partial bill payment, and rejected overpayment with retained input. Automated checks cover math, dates, refunds, bills, backups, CSV, authentication, origin protection, stale writes, concurrent writes and owner isolation. Actual installation on a physical phone and real multi-device sign-in require user verification.

## Later

Refine UI/UX and add a mascot. Inventory, payroll, tax filing, bank sync, team access, app-store distribution, automated recurring entries and push notifications remain outside this release.

## Offline use and synchronization (October 2026 update)

After the first authenticated online load, the app saves an owner-scoped workspace in IndexedDB and prepares an identity-neutral static shell. The Ready for offline use status is shown only after the service worker verifies every required cached asset and a device workspace exists. Fonts are bundled locally with their OFL licenses.

All normal saves first commit the optimistic workspace and queued command in one IndexedDB transaction. The UI confirms success only after transaction completion. Outbox commands use stable record IDs, stable action IDs, and before-values for affected records and financial dependencies. This includes before-values from the moment an edit form opened, so a refresh underneath an open form cannot silently overwrite a newer cloud edit.

A Web Lock elects one sync leader across tabs. Each sync authenticates the workspace owner, reads the current cloud revision, removes already-acknowledged actions, and replays the queue in order. Unrelated changes merge; record, payment, and refund conflicts remain saved for review. The API checks required expected values, model validation, ownership, idempotency and atomic D1 revision changes. Legacy clients retain strict revision checks. No database schema migration or production data reset is required.

IndexedDB stores local financial data without an app passphrase, as requested. Anyone with access to the unlocked phone/browser can access it. Browser storage can be cleared or evicted; the storage-protection request is optional, and JSON backups remain important. Full backups include unsynced records plus recovery metadata for pending commands and conflicts. Normal restoration restores the consistent saved records, requires online access and no pending local changes, and does not blindly replay archived conflicting commands. Keep the original recovery file if unresolved intents need further review.

Sign-out waits for the sync leader, blocks on pending work unless the user explicitly discards it, clears local financial data, and finishes cloud sign-out through the platform-owned route. Offline sign-out retains only a non-financial marker so cloud sign-out can complete when connectivity returns. Account-specific queues never sync under another identity.

The service worker never caches API responses, authenticated server-rendered pages, or auth routes. Its static shell has no owner identity or financial records. Failed asset downloads or a login page in place of a script reject an update. Immutable older assets remain available for already-open tabs. The offline build includes the service-worker source in the cache fingerprint.

Limits: the existing 5 MB stored cloud workspace and 20,000-transaction limits remain. API requests allow up to 12 MB to accommodate before-values alongside a change; imported JSON backup files allow up to 20 MB. Storage failure leaves the old state and queue intact and does not claim a successful save.

Verification for this update: 62 automated tests cover the model, owner isolation, compare-and-swap writes, IndexedDB rollback/quota failure, concurrent tab saves, queue recovery, stale open forms, duplicate acknowledgements, conflicts, and service-worker caching/privacy. Local browser QA reopened the app with its server stopped, saved a PHP 321.09 expense, reloaded while disconnected, and verified exactly one transaction after reconnection. Browser conflict review displayed both local and cloud edits and successfully preserved the cloud choice. Physical phone restart/airplane-mode testing remains a device acceptance check.

Production verification also covers the hosting canonical HTML redirect: only the same-origin offline directory is accepted, with the shell marker verified. Authentication and cross-origin redirects are rejected.
