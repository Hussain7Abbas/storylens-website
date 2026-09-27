# Reading media validation — 2026-09-28

`ReadingShowcase` integrates the real English and Arabic Chrome store demonstrations into the landing pages. Source captures live in the umbrella repository at `docs/chrome-store/assets/` and `assets/ar/`. All sample prose is original; no personal reading data appears.

## Assets and behavior

- Five screenshots per locale, encoded as quality-85 WebP at 1280 × 800 with quality-80 640 × 400 alternatives. Gallery images use responsive sources and lazy loading; enlarged images retain the full resolution.
- Local H.264 MP4 recordings exported from the original raw captures without burned-in store captions (about 2 MB English and 1.7 MB Arabic), with `playsInline`, native controls, and `preload="none"`. No autoplay or external player.
- Six WebVTT cues per locale converted from the source SRT timestamps; the last cue ends just before the actual MP4 ends. The website shows these cues at the top center of the video in a dimmed panel with a 12px background blur. Each cue fades in and out over 0.45 seconds, synchronized to the current playback time and seeking; reduced-motion users see an immediate change. Native captions remain available without JavaScript or when selected in the video controls. A localized expandable text transcript lists the same six steps.
- Native screenshot dialog tested with Enter, Escape, the close button, and focus returning to the opening link. Without JavaScript the links open the screenshot directly.
- Captures retain their recorded light extension theme. Frames, text, and controls follow the website theme and Arabic layout uses RTL.

## Verification

- All four Story Lens submodules passed `bun run typecheck` after the caption change.
- Website `bun run lint` and `bun run build` passed, including the regenerated static CSP hashes. The existing package manifest needed formatting to pass Biome; no dependency versions changed.
- Full Playwright suite after the first caption implementation: **184 passed, 4 skipped**, across Chromium, Firefox, WebKit, and mobile Chromium. The four skipped checks are video playback in Firefox/WebKit; actual playback and all six caption cues were verified in desktop/mobile Chromium. Gallery keyboard interactions and axe checks run in every project.
- Final focused media suite after the last cue and layout refinements: **8 passed** in desktop/mobile Chromium. It checks top-center placement, background blur, fade-in and fade-out, the final cue disappearing before the video ends, reduced motion, and switching to native captions without duplicate text. The website build and Biome also passed after these refinements.
- A separate browser check confirmed screenshot links navigate successfully with JavaScript disabled in both locales.
- Final Lighthouse assertions passed on the integrated pages. English and Arabic landing pages both scored **100** for performance, accessibility, best practices, and SEO; LCP was **1.21 s / 1.42 s** and CLS **0**. The privacy reference page also scored 100 in all categories. See [measured results](lighthouse-summary.json). This is the configured mobile 4G profile, not a manual assistive technology audit.
- Browser captures at 1440px desktop and 390px mobile were inspected in English/Arabic and light/dark. The `*-desktop.webp` files capture the complete media section; `*-mobile.webp` files show its entry viewport. No horizontal overflow was found by the browser checks.
- The final `*-caption-1440.webp` and `*-caption-390.webp` captures show actual English/Arabic captions at three seconds of playback, at desktop and mobile sizes. With JavaScript disabled, the Arabic WebVTT track was observed in native `showing` mode; when enabled in the normal interface, the custom caption overlay hides.

Build and validation are local; production publication follows the existing main deployment workflow.
