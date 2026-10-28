# Peso — Personal & Business

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

The PWA manifest and generated PNG icons allow home-screen installation in supporting browsers. The service worker caches only the generic offline page, icons and manifest. It deliberately never caches private pages, authentication routes, financial API responses or records. Reconnect to read and save financial data.

## Limits

One owner, one business, PHP only; manual records. Maximum 20,000 transactions and 5 MB per workspace, with up to 50,000 retained action IDs. Exceeding limits shows an error rather than enabling billing. Cloud availability and platform limits remain subject to the hosting provider. Regular JSON exports are recommended.

Browser QA covered desktop and phone layouts, transaction entry/editing, split spending, card setup, partial bill payment, and rejected overpayment with retained input. Automated checks cover math, dates, refunds, bills, backups, CSV, authentication, origin protection, stale writes, concurrent writes and owner isolation. Actual installation on a physical phone and real multi-device sign-in require user verification.

## Later

Refine UI/UX and add a mascot. Inventory, payroll, tax filing, bank sync, team access, app-store distribution, automated recurring entries and push notifications remain outside this release.
