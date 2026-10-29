# Monix Proposal 05 — Canadian bank designs

Open `Monix-Proposal-05-Review.html` for the self-contained review, or run `node serve.mjs` in this folder and visit `http://127.0.0.1:5190/Monix-Proposal-05-Review.html`.

The review opens at iPhone 16 Pro Max 440 × 956 in light and dark themes. Scroll inside each phone. Accounts, Home, Account setup, Provider library, existing profile controls and Monix interactions are available. Size options include iPhone 15, small phones, tablet, desktop and landscape. Sample saves use a separate local IndexedDB database; there are no production financial API calls or cloud sync of sample accounts. A storage failure retains the previous saved sample. Each phone reloads saved samples on reopening; concurrent sample editing in two panes is not a production sync implementation.

Five official Canadian provider marks are bundled with their source URLs and SHA-256 hashes in `bank-asset-sources.json`. Original Monix card layouts use CIBC burgundy/gold, TD green, Scotiabank red, RBC blue/gold and BMO blue/red. Other providers use text marks. Bank marks remain their owners’ trademarks; their inclusion does not claim affiliation or grant ownership under the app’s MIT license. Font licenses remain under assets. No paid assets, bank links, or software installation are involved.

The shared catalog stages 13 named Canadian providers, 14 Philippine providers, and Other / credit union. Canada / Philippines / All search includes aliases. Account provider and style are optional metadata; legacy accounts stay neutral. Bank subtypes are chequing/savings/other and never change a bank balance into credit debt. Two independent CIBC sample IDs demonstrate multiple accounts per provider. Newly added samples have no invented starting balance entered in their form.

## Verification

- 84 financial, storage, offline, isolation, service-worker, converter and provider tests pass; TypeScript and production build pass.
- New checks cover catalog search, all appearance-only changes preserving financial fields, optional metadata validation, legacy backups, CSV metadata, offline queue persistence, unrelated cloud rebase, acknowledgement, and identical balances/reports after styling.
- Embedded dark-phone text and amount bounds pass at 320, 375, 393, 430, 440, 768, 1024 and 1440 px plus 956 × 440 landscape. Results are saved in `responsive-audit.json`. Decorative shapes intentionally extend inside clipped card backgrounds; financial text does not.
- Browser checks: Canada search for “Royal Bank”; Philippines BPI filtering; CAD amount, nickname and type retained when choosing another provider; credit sample saved/reopened with matching limit and payment day. Test samples use an isolated QA store.
- Full-height form footer remains visible at 440 × 520 simulated keyboard space and in landscape. Long nicknames and CAD 9,999,999,999.99 were exercised at 320 px with enlarged text. Inputs may scroll their long editable value; displayed amounts remain readable. Physical Safari keyboard/installation testing remains required.
- Passive SVG and source hashes checked with `node audit-assets.mjs`; both packaged phone script blocks compile with `node check-package.mjs`. The portable review was opened and used, not only syntax checked.
- The browser reports an unattributed MutationObserver error during embedded review startup; no matching observer exists in these authored scripts. Both phones render and their tested controls operate. Do not treat this as a clean-console claim.

## Release boundary

This is a phone approval deliverable, not a live release. The live private Site, existing records, installed identity, authentication, and real PHP ledger remain unchanged. Canadian workspace currency/auth migration and full live UI integration follow approval. The earlier dependency/security release review and actual iPhone installation/airplane-mode checks are still release gates.

The converter retains its prior reference-only behavior. Sample CAD display does not enable mixed-currency bookkeeping. Provider metadata is staged in the existing model/queue/backup paths; no database migration or account seeding is needed for these optional fields.

To regenerate the shared catalog bundle and portable proposal from this repository, run: node scripts/build-provider-preview.mjs (repository root).
