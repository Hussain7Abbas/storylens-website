# Verification — 2026-09-27

76 Playwright tests pass in Chromium, Firefox, WebKit and a mobile Chromium viewport. All six locale routes are covered in both themes with axe WCAG 2/2.1/2.2 tags; zero violations. Tests cover demo replacement/highlight/note, locale path preservation, theme persistence, mobile dialog/Escape, FAQ, reduced motion and static no-JavaScript content. Browser console had no errors in the inspected static views. Desktop and Arabic mobile captures were visually inspected.

All four submodules pass typecheck. Client has 7 passing tests and builds. Website Biome and static export pass. Shell scripts pass bash -n. Chrome store ID was read from production configuration and its page returned HTTP 200 with title StoryLens - Chrome Web Store.

Lighthouse summary JSON files record actual 4G profile scores and timings. The earlier default slow-4G profile after optimization recorded ~2.24s landing LCP, so the original <2s stretch target is not met for that profile. Optional desktop Three.js renderer chunk is ~244KB gzip before companion chunks, above the 180KB stretch budget. Manual VoiceOver, physical Windows, rich-results debugger, field INP and CPU frame profiling are not claimed complete.

Server build initially exported successfully but Bun 1.3.14 crashed during Next worker shutdown. Dedicated Node 24.21.0 is installed at /opt/storylens-node and used only for the Next build runtime. Bun remains the dependency manager and package-script runner.

Legal defaults are owner-approved; private contact address pending. DNS created through flarectl; standalone server repo cloned. HTTPS/publication validation will be appended after launch. Store dashboards and search-engine submissions remain owner actions.

36 responsive layout checks passed across 320/768/1440 widths, both locales, all page types, and both themes after fixing the 320px English hero grid’s minimum-content overflow. Root make build passes all four apps. Server install/typecheck/Biome/static build also pass with the dedicated Node runtime. TLS certificate is issued, valid through 2026-12-25, with scheduled renewal.

GitHub Actions quality run 36273052600 passed dependency installation, typecheck, Biome, static export, browser tests and Lighthouse. Optional 3D enhancement now uses an original chapter texture behind the refracting lens, with demand rendering and damped pointer motion.

Desktop WebGL smoke check mounted the optional canvas with zero page errors; chapter texture is clipped to the lens aperture. Captured en-desktop-lens.png for visual review. Browser test reports now include an HTML report for CI artifacts.
