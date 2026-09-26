# Story Lens website instructions

Standalone public repository, also pinned in the Story Lens umbrella at `apps/website`.
Use Bun and Biome. Next.js App Router exports all pages statically; Nginx serves the export with no Node server. Commands are in `make help`.

- Use strict TypeScript, named exports except framework entries, no `any`, and no lint suppression comments.
- Use design tokens from `design-system/MASTER.md`; visual values belong in `src/app/globals.css`. Three.js scene constants are a documented decorative exception.
- Keep English and Arabic messages in `src/i18n/messages/`; update both. Use logical CSS properties and test RTL.
- Legal bodies live in `src/content/legal/{en,ar}` as MDX. Verify data claims against the source inventory, update both languages, version/date, and changelog together. Never infer third-party retention guarantees.
- Motion is optional. Respect reduced motion, render content before JavaScript, and keep Three.js lazy and absent on mobile or reduced motion.
- Run typecheck, Biome, build, Playwright/axe, and relevant Lighthouse checks. Record actual results; do not claim manual audits were done without evidence.
- `deploy/security-headers.ts` hashes static inline scripts after each export; never deploy pages with headers from a different build.
- Server checkout: `/srv/storylens-website` on `ssh raseen`, branch `main`. Deploy through `make sync`; it installs with Bun, checks, builds, swaps a release symlink, validates Nginx, and reloads. The API is a separate repository.
- Keep old releases for rollback; never remove an active release. Public contact/legal decisions require the owner’s review before first publication.
