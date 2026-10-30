# Monix Preview — iPhone testing

Public sample-only preview: https://monix-phone-preview.duskyfield134.chatgpt.site/

## Install on iPhone

1. Open the link in Safari. No ChatGPT sign-in is required.
2. Tap Share, then Add to Home Screen. Keep Open as Web App enabled if offered.
3. Open Monix Preview from its icon. Go to the Sample preview status or Settings and wait for Ready for offline preview.
4. Try light/dark mode, card taps and scrolling, PIN fallback, keyboard entry, landscape, closing/reopening, and airplane mode.

The separate manifest ID /monix-preview, origin, browser stores and worker cache do not share the real app's installed identity or financial data. The normal operating-system status area and home indicator are used; the artificial review frame/bars are removed.

## What this is

The approved Proposal 08 UI, sample Canadian/Philippine card library, fictional Alex Rivera profile, local sample account changes, local profile crop and preferences, working disposable Monix PIN, and clearly labeled device-verification simulation. Transaction history and reports are design samples; entry forms demonstrate in-memory feedback, not complete financial bookkeeping. Converter calculations use the bundled ECB reference published 28 October 2026, explicitly labeled as a saved preview reference. There is no live-rate request.

Use disposable sample information. No real bank, Monix account registration, cloud sync, financial API, production database, or native Face ID enrollment is connected. Local samples and test PINs are not sent to other visitors. Browser storage is device-local and can be cleared or evicted. Screen privacy is not encryption.

## Source and release

Run npm run build:phone-preview from the repository root to regenerate public/ from the preserved Proposal 08 sources and phone.css/phone.js. Run node phone-preview/serve.mjs for loopback QA at port 5194. The Sites checkout stages these assets as dist/, and only dist/ plus its static hosting manifest are published. Server scripts, source credentials, runtime databases, screenshots and real records are not in the deployable static assets.

The service worker atomically caches its complete version, verifies readiness on request, normalizes the hosted canonical root without accepting redirects, excludes API/auth paths, retains previous caches during updates, and never clears IndexedDB. A waiting update activates after existing preview windows close.

110 financial/offline/privacy/preview tests, TypeScript check, and production build passed before publication. Browser verification and deployed access results are documented in the task handoff. Real iPhone touch scrolling, Home Screen installation, keyboard/safe-area behavior, and airplane mode remain the user's final physical-device checks.

The existing private Peso/Monix app is unchanged. No new paid service, subscription, domain or database was enabled.

## Mint & motion update

The phone interface uses locally bundled Manrope (full character set, including the peso sign and tabular figures) from https://github.com/google/fonts/tree/main/ofl/manrope under the included OFL. Outfit SemiBold is reserved for the Monix wordmark. Earlier proposals remain unchanged.

The companion has one timer controller, stable SVG layers, direct Home tap reactions, optional words, Calm/Extra playful energy, pause and reduced-motion support. It suspends during hidden windows, task sheets, focused fields and feedback messages. Profile portraits remain static. Installed safe areas belong to actual iOS, with edge-to-edge status-bar configuration and no simulated device decoration.

116 regression tests, typecheck and production build pass. Responsive checks cover 320–1440 px and phone landscape; actual iPhone installation, touch, keyboard and airplane-mode checks remain required. Close all preview windows and reopen for a waiting update. Before removing/re-adding an old icon, preserve any sample information or pictures you want to keep; browser-local samples are not backed up or synced.
