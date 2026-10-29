# Monix — Proposal 07

Phone-design approval package, 30 October 2026. Proposal 06 is preserved. The live app is unchanged.

## Open the review

Open Monix-Proposal-07-Review.html in a modern browser. It embeds the interface, artwork, marks, fonts, and scripts, with light/dark phone previews. For reliable IndexedDB and offline-shell testing, serve this folder with node serve.mjs, then visit http://127.0.0.1:5192/Monix-Proposal-07-Review.html. Run refresh-review.html if an older cached preview appears. Stop the local server when finished. No package install is required for this standalone review server.

The phone frame, status bar, and Dynamic Island are preview decorations. Captures and screens.html show iPhone 15, iPhone 16 Pro Max, PIN, cooldown, lock setup, and credit-card states. The full provider library from Proposal 06 is retained.

## Working review behavior

- Artwork-only fronts; separate nickname, lock marker, and flip control. Conditional backs show financial details only when allowed.
- CIBC chequing and Scotiabank credit are protected samples. Real existing and newly created accounts default to balanceLocked=false.
- Create your own disposable six-digit review PIN; never use a real phone or bank PIN. One local PIN covers protected cards for that sample owner and installation.
- Salted PBKDF2-SHA256 verifier, 600,000 iterations, 128-bit salt, 256-bit output, owner/origin/installation-scoped IndexedDB. PINs are never logged or synced.
- Persistent failed-attempt cooldowns: 30, 60, 120, 240, then 300 seconds for successive groups of five failures.
- Unlock sessions are tab-local and memory-only; hidden/reloaded pages and one minute of inactivity relock. Hide now and PIN replacement broadcast lock signals, never unlock signals.
- Protected edits and sample backup export require unlocking. Unfinished form values survive relocking in memory without rendering the protected amount.
- Sample owner A/B controls demonstrate isolation; these are not real sign-in accounts. Sign-out is an explicitly labeled preview exit.
- Reduced motion switches faces without rotation. Privacy sheets use the visual viewport for keyboard space and keep the save control reachable.

This is screen privacy, not encryption. Transactions, income, spending, and budgets remain readable. PIN metadata and passkey enrollment must never enter financial backups or the sync queue. A downloaded sample backup is explicitly NOT a restorable Peso financial backup.

## Device verification and integration boundary

All biometric buttons in this review are clearly labeled simulations and operate on sample data only. They do not open Apple's Face ID prompt. Production-capable WebAuthn helpers are staged separately in app/balance-privacy.mjs: HTTPS-only platform enrollment, required user verification, fresh one-use challenges, origin/RP/owner checks, public-key signature validation, and abort handling. Their native adapters and signed responses are covered by automated tests, not a physical iPhone test.

After phone-design approval, wire these helpers into the final HTTPS app with owner identity supplied by authenticated code, online reauthentication for forgotten-PIN recovery, protected financial render/export guards, pending-action-aware sign-out, and local setup on a new installation. Face ID cannot be required exclusively; iOS may use its system passcode. Do not collect that system passcode in Monix. Browser clearing can remove the PIN and enrollment; it does not encrypt financial data. No paid service was added.

The validated optional balanceLocked flag is already staged through existing model commands, offline queues, acknowledgement, CSV metadata, and financial backup validation. No account IDs, style IDs, calculations, storage identifiers, or existing balances were migrated. Actual cloud/frontend integration is deferred.

## Verification

- 99 automated financial, offline, storage, rate, provider, privacy, and signature tests passed; TypeScript check and production build passed.
- Browser checks: PIN setup/unlock, wrong PIN, persistent escalating cooldown after reopening, owner isolation, cancelled simulation, cross-tab Hide now, form restoration, backup guard, and secret-free sample backup.
- Cached-shell reopening and saved PIN unlock succeeded with the local server stopped. This is not physical airplane-mode testing.
- All requested widths (320, 375, 393, 430, 440, 768, 1024, 1440) and 956 × 440 landscape checked for page overflow, privacy text clipping, and locked-amount rendering. Enlarged text, reduced motion, 320 × 520 keyboard-space simulation, and credit-back financial text bounds checked. See captures/responsive-audit.json.
- Physical iPhone Face ID/passcode, passkey availability offline, real keyboard/safe areas, account recovery, installed-app airplane mode, and full integrated financial export guards remain release gates. Prior dependency security review remains a release prerequisite; a passing build is not a deployment security clearance.

Official provider sources and local asset licenses remain in bank-asset-sources.json and assets/. Passkey references: https://developer.apple.com/news/?id=21mnmxow and https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API.
