# Story Lens design system

## Identity: Ink & Iris

The approved direction is a calm reading interface with neutral ink surfaces and an iris accent. The website and extension share this identity. The approved logo is Lensbook (option 2): an open book integrated with a lens. Source art, normalized master, size exports and palette chart live in the umbrella `docs/branding/`. Regenerate the assets with `node docs/branding/scripts/export.cjs` after changes to the selected source or palette.

Use one primary brand accent for actions, links, focus, and selected controls. Neutral icons support secondary utilities; green signals success, red errors, and orange warnings. Reader-defined keyword/category/nature colors remain independent of the brand and must not be recolored by a UI refactor.

## Canonical tokens

The website values live in `src/app/globals.css`. The extension mirrors them in `src/styles/palette.ts`, consumed by the Mantine theme and in-page shadow surfaces. Do not create a root shared package: the apps are independent repositories.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#f7f7fb` | `#171820` |
| Surface | `#ffffff` | `#22232e` |
| Text | `#202132` | `#eeeff6` |
| Muted text | `#656779` | `#a8abbe` |
| Border | `#e0e1eb` | `#383a4b` |
| Primary accent / focus | `#6554c0` | `#b5a8f5` |
| Accent hover | `#5544a7` | `#c9befa` |
| Text on primary | `#ffffff` | `#211a39` |
| Accent soft | `#eeebfa` | `#302a45` |
| Neutral wash | `#eeeefa` | `#302a45` |
| Success | `#26705e` | `#80cbb0` |
| Error | `#b4233b` | `#ff9ba9` |
| Warning | `#9a4c00` | `#f5c078` |

Illustrative reading highlights: sage `#dceee6`, sand `#f4e5cc`, iris `#e7e1fa`, with `#262337` text. These demonstrate categories and never impose saved user colors.

## Typography and iconography

Inter is the UI and heading family. Cormorant Garamond is reserved for the website's chapter card and reading passage. IBM Plex Sans Arabic supplies Arabic UI and reading text, with natural letter spacing and generous leading. Fonts are self-hosted (Next font on the website; `@fontsource` in extension pages). Mobile website UI uses system fonts and the reading passage uses Georgia, with Tahoma for Arabic.

Lucide is the only UI icon family across both apps: 1.75 stroke weight, normally 16–24px, `currentColor`. Extension React UI uses `lucide-react`; its vanilla launcher uses named `lucide` nodes and `createElement`. Decorative icons are hidden from assistive technology, and icon-only controls need localized accessible names. The Lensbook raster brand mark is separate from the Lucide interface icon family.

## Components and layout

Use clear sans headings, neutral surfaces, subtle borders, and restrained shadows. Controls use approximately 10px corners, cards 12–16px. Primary actions have solid iris fills and theme-specific foregrounds. Secondary controls remain neutral; selected tabs use a surface with iris text on a soft track. Avoid coloring every utility icon. Preserve labels, native interaction, form flows, and visible 3px focus rings.

Keep the 4/8/16/24/32/48/64 spacing rhythm, fluid headings and section spacing, logical CSS properties, 76rem content width and 46rem prose measure. Website targets are at least 44px; compact extension utilities expand to 44px on coarse pointers. The launcher actions use 44px targets with 8px gaps. Sticky tab/search offsets must follow their actual heights.

The website hero pairs product copy with an aligned chapter card, illustrative highlights, a character note below the passage and optional glass lens. Use the original demo instead of unverified testimonials. Feature cards, companion panel, bilingual legal pages and account forms all use the same tokens. Extension pages cover onboarding, reading, settings, forms and extraction. In-page launcher, tooltips and AI panels honor system color scheme; extension pages honor their saved Mantine preference.

## Motion and 3D

Motion is optional. GSAP reveals are one-shot, clean up through useGSAP, and convey no required information. Three.js stays lazy, gated by desktop width, WebGL2, hardware concurrency, data-saver, visibility and motion preference. Demand rendering avoids continuous work. Both the chapter texture and decorative lens rim read the current palette and update on theme changes. Geometry/camera values are deliberate decorative constants.

Reduced motion disables reveals and the lazy scene, and removes UI transitions. Keep all reading content and actions present before animation or JavaScript.

## Content and validation

Use one h1, labeled sections, locale-preserving links, native FAQ/details and native mobile dialog/Escape behavior. All product claims still map to `copy-deck.md` and `data-inventory.md`. Demo characters remain Mira, Vale and Orin. Source is PolyForm Noncommercial, not permissively open source.

Historical research in `skill-recommendations.md` and `design-system/story-lens/MASTER.md` is not the active palette. It informed the editorial structure; the owner's Ink & Iris choice supersedes its amber/color/font recommendations. The local UI UX Pro Max query `reading extension restrained violet --design-system` supported restrained grids and a coherent hierarchy; reject its amber palette and unverified testimonials in favor of the approved direction and existing original demo.

Record actual browser, accessibility, build and performance evidence under `design-system/validation/`. Historical reports are dated evidence, not proof that a later change passed. Lighthouse CI retains the recorded mobile 4G profile. Optional desktop Three.js renderer was historically ~244KB gzip, above the 180KB stretch budget, and earlier slow-4G LCP ~2.24s exceeded the 2s stretch goal; do not silently mark these budgets passed.
