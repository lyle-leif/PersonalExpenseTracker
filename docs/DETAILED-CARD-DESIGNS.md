# Monix Proposal 06 — detailed card artwork

Open `Monix-Proposal-06-Review.html` for the self-contained, interactive review. It embeds fonts, artwork, scripts, and both phone previews. For a local HTTP preview, run `node serve.mjs` in this folder with Node 24 and open http://127.0.0.1:5191/Monix-Proposal-06-Review.html. `refresh-review.html` updates an older cached review without clearing sample accounts or preferences.

## What is included

- 104 artwork variants across 28 Canadian and Philippine providers, with 48 named physical/prepaid card references and original Monix alternatives. Every provider has a deliberate pattern, static finish, readable provider treatment, and original financial layout.
- CIBC, TD, Scotiabank, RBC, and BMO lead the phone examples. BPI and MariBank reuse the already bundled marks. Other providers use text when a suitable official mark is unavailable.
- Separate artwork and financial areas; full account cards, Home previews, provider thumbnails, and account setup reuse the same renderer. Credit cards retain debt, credit available, and payment reminders. Wallet and cash examples have their own gallery view.
- Canada / Philippines / All search, balance/credit/wallet gallery views, source links and reference dates, and a working artwork selector. Product names are design references, not statements about the card a user owns.
- No cardholder names, full or partial card numbers, expiry dates, security codes, bank connections, paid assets, or new cloud services are added. Decorative chip/foil details are original CSS, not credential fields.
- The Accounts heading is compact; closing a card editor retains the list position and returns focus to the edited account.

## References and licensing

`card-design-references.json` records the product name, official source, review date, pattern, and palette for each reference. Sources were researched on 2026-10-29; follow-up checks completed on 2026-10-30. These are original Monix interpretations, not exact reproductions or promises of current issuance. References include prepaid products and an explicitly labeled CIMB existing-card example. Where no product is assigned for an account role, the UI says Monix original.

Forty-four source requests returned HTTP 200. Security Bank, GCash, and Tonik returned anti-bot responses for four references; their official indexed product/help pages were checked without bypassing those restrictions. Bank marks remain their owners' trademarks, outside the app's MIT ownership grant. Font licenses are bundled under `assets/fonts`. Existing Canadian mark sources and hashes are in `bank-asset-sources.json`. Research photos containing issuer sample text were not included in the review or repository.

## Verification

- 88 financial, storage, offline, service-worker, converter, isolation, and provider/design tests pass. Type checking and the production build pass.
- Every artwork selection preserves account IDs, currency, kind, opening balance, credit limits, closing/payment days, and other financial fields. Tests cover model commands, neutral unknown styles, incompatible selections, backups, CSV exports, persistent offline actions, acknowledgement, and owner isolation.
- Both themes pass text-width and page-overflow checks at 320, 375, 393, 430, 440, 768, 1024, and 1440 px, plus 956 × 440 landscape. At 320 px, enlarged-text checks cover all 28 balance examples, all 28 credit examples, and the three wallet/cash examples. Results are in `responsive-audit.json`.
- Browser checks confirm a selected original design survives saving and reopening; provider switching preserves the nickname, negative balance, currency, and account type. Credit artwork changes preserve debt, credit limit, and payment day. A duplicate CAD prefix on negative values was found and fixed.
- CAD 9,999,999,999.99 and a long nickname remain readable at 320 px. The fixed save footer remains within a 440 × 520 simulated keyboard viewport. Long editable inputs can scroll their value; displayed amounts do not truncate.
- Artwork is static, with no shimmer loop. Card palette text pairs meet a 4.5:1 baseline contrast check; the lighter RBC credit reference uses dark text. The existing mascot pause/reduced-motion controls remain available.
- Packaged child scripts compile; local mark hashes and passive SVG content are checked. Both embedded phone previews were exercised in the portable review. An unattributed MutationObserver startup error from the browser integration has previously appeared; this is not a clean-console certification.

## Integration boundary

This is an approval proposal. The private live Site, installed app identity, real financial records, authentication, and existing PHP ledger were not changed. Proposal 05 remains intact. Optional `cardStyleId` variants are staged in the presentation catalog; existing IDs and selections remain valid, with safe neutral rendering for unknown future designs. No database migration or sensitive fields are needed.

The real financial sync queue remains the existing owner-scoped implementation. Review sample saves use a separate local IndexedDB store and are not synced across panes or devices. Actual iPhone/Safari installation, real keyboard, airplane-mode testing, and the prior dependency/security release review remain integration gates. Canadian workspace/authentication migration is still separate work after phone approval.

Regenerate from the repository root with `node scripts/build-card-design-preview.mjs`. Run `npm test`, `npm run typecheck`, and `npm run build` for the application checks.
