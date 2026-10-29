# Monix — Proposal 08

Clean cards and smooth touch interactions. Proposal 07 is preserved. Local sample-only design review; the live app and financial records are unchanged.

## Open

Open Monix-Proposal-08-Review.html manually in a modern browser for the self-contained light/dark phone comparison. For reliable local storage and offline-shell testing, run node serve.mjs from this folder, then open http://127.0.0.1:5193/Monix-Proposal-08-Review.html. No installation or paid service is required. refresh-review.html updates a previously cached review shell. Stop the server when finished. Captures and screens.html show phone states.

## What changed

- The account nickname, provider/type, and small protected-balance indicator are above the artwork. Fronts contain artwork only. One section-level hint replaces per-card Flip/Unlock controls and repeated captions.
- Tap either face to flip it. Edit is a separate 44-pixel target beside the account description when the back is shown. All detailed provider artwork is retained, including compact Home and setup previews.
- The stable card controller rotates outward for 240 ms, swaps a single rendered face at the edge, and rotates inward for 240 ms. It updates only that card, preserving the button, keyboard focus, and scroll position. Repeated taps during a flip are ignored. Expired permissions are rechecked at the midpoint.
- Relocking aborts active animations, removes financial faces, and restores artwork immediately. Reduced motion changes sides without rotation. Navigation/sheet entrances use 260/280 ms scoped transitions; controls use 180 ms transitions. Financial numbers never animate.
- Balance privacy lives in Settings. There is no persistent Privacy header button or separate per-card unlock button. Hide now remains available while unlocked.
- A protected-card tap on an unconfigured installation explains setup and links to Balance privacy. After local PIN setup, explicitly enabling Device unlock in Settings makes protected taps open the labeled simulation automatically, with PIN fallback. Successful verification flips only the tapped card.
- Device-unlock buttons are SIMULATIONS in this proposal. They never call Face ID or collect an Apple passcode. Production WebAuthn helpers remain staged for final HTTPS integration and physical iPhone verification.
- Existing six-digit PIN storage, cooldowns, owner isolation, tab-local one-minute sessions, backup guards, and cross-tab relocking remain. Protection defaults off for real/new accounts; CIBC and Scotiabank are intentionally protected samples. Transactions, income, spending, and budgets remain readable. Screen privacy is not encryption.

## Verification

104 automated tests passed, including new flip sequencing, repeated-tap, permission-expiry, interruption, and reduced-motion tests. Existing financial/offline/privacy tests, TypeScript check, production build, portable-script compilation, and local asset checks passed.

Browser checks covered front/back taps, Enter and Space activation, rapid double-click rejection, automatic simulated device prompts after opt-in, failed/cancelled verification, PIN fallback, single-card reveal, Settings navigation, compact Home cards, form drafts restored after cross-tab relock, and locked-amount redaction. The final card can scroll clear of the companion dock and bottom navigation. Cached reopening, local PIN fallback, flipping, and redaction after Hide now also passed with the local server stopped. This is not a physical airplane-mode test.

Widths 320, 375, 393, 430, 440, 768, 1024, 1440 and 956 × 440 landscape were inspected for overflow, clipped descriptions, and locked financial content; see captures/responsive-audit.json. Enlarged text, reduced motion, long names, CAD 9,999,999,999.99, and a 320 × 520 keyboard-space simulation were checked. Screenshots include iPhone 15 at 393 × 852 and iPhone 16 Pro Max at 440 × 956. Status bars and frames are preview decorations only.

The browser check uses click/keyboard interaction. Real touch scrolling, native Face ID/passcodes, installed-app safe areas and keyboard behavior, physical airplane mode, online PIN recovery, and full integrated export guards remain release checks. This proposal does not enroll native credentials. QA fixture PINs remain only in the browser's isolated QA store, outside the review package and backups.

## Compatibility and release

No financial schema, account identity, balance, artwork ID, transaction history, sync queue, or installed-app identity was changed in this iteration. No PINs, credentials, or runtime databases are bundled. Phone-design approval precedes live integration. Existing dependency security review remains a release prerequisite. Provider references, asset hashes, and font licenses are preserved locally.
