# Ink & Iris validation — 2026-09-27

Local implementation of the owner-approved identity. Existing logo, favicon, browser toolbar icons, and social artwork are retained pending the owner's replacement logo. No release or production deployment was performed.

## Results

- All four apps pass `bun run typecheck`.
- Website static build and full Biome check pass.
- Extension Chrome MV3 and Firefox MV2 production builds pass. Biome check passes for the changed source files; existing host-site CSS has seven nonblocking `!important` warnings. Existing large extension bundle warning remains.
- Website: 172 existing Playwright tests pass across Chromium, Firefox, WebKit and mobile Chromium. Covers English/Arabic, light/dark axe checks, landing/legal/account pages, demo controls, theme persistence, locale links, mobile menu/Escape, reduced motion and no-JavaScript content.
- Website: 48 additional layout checks pass at 320/768/1440px, in both locales/themes, for landing/privacy/terms/login. No horizontal overflow or page errors. Eight core text/background pairs range from 5.00:1 to 15.42:1.
- Actual loaded Chrome extension: four popup views (both locales/themes) have zero axe WCAG 2/2.1/2.2 violations, no horizontal overflow, and no page errors. Add forms open correctly; settings AI tabs render. Offline fixtures are confined to an isolated browser profile; no production data was changed.
- Options and embedded popup fit 320px and 768px viewports. They share one renderer, with one React root per page.
- Lighthouse CI passes all configured assertions for English/Arabic landing and English privacy on the recorded mobile 4G profile. All four category scores are 100 on each route, LCP approximately 1.10–1.17s, CLS zero. See the numeric summary; this does not measure field performance or the optional desktop 3D bundle budget.

## Evidence

- [Website layout and contrast](website-review.json)
- [Extension popup/accessibility and responsive views](extension-review.json)
- [Lighthouse summary](lighthouse-summary.json)
- [English light website](website-en-light-1440.png) · [English dark website](website-en-dark-1440.png)
- [Arabic dark mobile website](website-ar-dark-320.png)
- [English light popup](extension-en-light.png) · [English dark popup](extension-en-dark.png)
- [Arabic light popup](extension-ar-light.png) · [Arabic dark popup](extension-ar-dark.png)
- [English light form](extension-form-en-light.png)
- [Arabic dark settings](extension-settings-ar-dark.png)

The desktop website, 320px Arabic website, extension popup/form and settings captures were visually inspected. The chapter note now stays below the passage; the compact header's language control becomes an accessible Lucide icon; the popup novel selector no longer gives empty chapter space half its width. No physical-device or screen-reader audit is claimed.

## Selection, navigation, deployment and desktop follow-up

- Shared form pages hide the originating page’s tabs and novel controls, retain the navbar, and restore the active tab on Back. Browser checks exercised keyword and replacement navigation plus selected-text Keyword/Alias/Version routes.
- The loaded Chrome launcher has one Add action. An actual page selection opened its iframe above the word, fuzzy parent search selected a downloaded keyword, and Continue transferred selected text into the alias form. Only its own extension iframe may send chooser commands.
- Both locales and themes were freshly captured for glossary, full-page form and selection UI. Website gallery images are optimized WebP in `public/images/extension/`; they follow the site theme. The captures use isolated sample data, never production credentials or records.
- Website’s full 172 browser tests passed after adding the gallery, along with Biome, static build and configured Lighthouse assertions. Gallery image loads and 320px layout passed for both locales/themes.
- Desktop: 10 Bun tests passed, including defaults for legacy settings and persisted tray preference. The actual Electron app on macOS passed light/dark axe checks and lifecycle checks: close hides the window, authenticated service stays available, activation restores it, and disabling tray plus close exits the process. Status refresh preserves unsaved edits. Windows tray behavior has not been exercised on Windows. See `desktop-review.json` and desktop captures.
- The tag deployment workflow and restricted SSH wrapper are implemented. GitHub `production` secrets were populated with `gh` from the resolved `raseen` host/user/port and a dedicated restricted key; arbitrary-command rejection was verified. The wrapper was installed outside the server checkout. No site release, tag, commit or push was performed.

[Selection checks](selection-review.json) · [Desktop checks](desktop-review.json) · [Desktop dark UI](desktop-dark.png) · [Gallery Arabic dark](gallery-ar-dark.png)
