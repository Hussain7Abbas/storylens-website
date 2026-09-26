# Story Lens design system

UI UX Pro Max source: nextlevelbuilder/ui-ux-pro-max-skill at `823b0a14d3539b5d78c0efb614426a4fab5985ec` (see validation record for authoritative commit). Query: `reading literary browser extension --design-system`. Raw recommendations are retained in `skill-recommendations.md`.

## Decisions

- Accept the editorial grid, restrained motion, brown/amber reading palette, clear hierarchy, accessible contrast, and hero → problem → explanation → CTA pattern.
- Reject testimonials: no verified testimonials exist. Use an original reading demo instead.
- Accept Cormorant Garamond for Latin display. Replace Libre Baskerville body with Inter for compact controls and readable UI. Use Noto Sans Arabic for Arabic; Next font self-hosts all three.
- Reject white on the suggested amber CTA: it fails body contrast. Use dark brown with white in light mode and pale amber with dark ink at night.
- Replace pure white cards and bright yellow paper with warm neutral paper, to keep the reading composition calm.
- Accept 4/8/16/24/32/48/64 spacing rhythm. Use fluid section spacing and typography.
- Keep the actual extension icon. Extension launcher border uses CSS brown (#a52a2a); popup Mantine primary is purple (#8231e4). Marketing uses literary brown rather than implying an exact copy of the purple popup.

## Tokens and components

The canonical implemented values live in `src/app/globals.css` `:root`, with night overrides in `[data-theme=dark]`. Light: paper #faf7f0, surface #fffdf8, ink #29251f, muted #696158, accent #92400e. Night: paper #211e19, surface #2b2721, ink #f4eee3, muted #c5baaa, accent #ebbc8b. Character chips use #dce8d5 / #f1d9bd / #deddf0 with #302c25 text. These are illustrative categories, not fixed colors imposed on users.

Font scale: display clamp(3.5rem,6.7vw,6.5rem), headings clamp(2.5rem,4vw,4rem), body 1rem, intro 1.125rem, reading 1.2rem. Arabic reading uses the Arabic font at 1rem with generous leading. Content width 76rem; prose measure 46rem. Components use logical properties, warm surfaces, light borders, restrained shadows, and a visible 3px focus ring. Breakpoints 768, 1024, and 1200. Sticky header z-index 30; skip link 100.

Controls meet 44px targets. Primary links have solid contrast and arrow cues. Only actual links/buttons have hover affordances. Native details provide keyboard-operable FAQ and table of contents; native modal dialog manages menu focus and Escape. Locale links preserve path/hash.

## Motion and 3D

GSAP reveals: 24px rise, 650ms power2.out, one-shot ScrollTrigger, cleanup through useGSAP. CSS controls use 200ms; motion adds no required information. Reduced motion disables GSAP and the lazy scene and removes transforms. Three.js is gated by desktop width, WebGL2, hardware concurrency, data-saver, visibility and motion preference, then delayed; demand rendering avoids continuous work. The static reading card remains visible underneath.

Deliberate decorative exceptions: the Three.js material color is fixed brown, mesh dimensions/camera coordinates are geometry constants, not CSS UI tokens; icon sizes, structural border widths, and micro typography are allowed in this stylesheet. No remote HDR, font requests, telemetry, or stock novel passage is used at runtime.

## Layout and copy

See page overrides and wireframes. One h1; sections have h2 and aria-labelledby. Original demo characters are Mira, Vale, and Orin. All claims map to `copy-deck.md` and `data-inventory.md`. Source is described as available under PolyForm Noncommercial, never as permissively open source.
