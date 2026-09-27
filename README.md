# Story Lens website

English and Arabic website for the Story Lens browser extension, with an original interactive reading demo, optional GSAP/Three.js visuals, privacy policy, and terms.

Production: https://storylens.iscoded.com · [Extension](https://github.com/Hussain7Abbas/storylens-extension) · [Desktop companion](https://github.com/Hussain7Abbas/storylens-client)

## Develop

Use Bun 1.3.6 or newer. `bun install --frozen-lockfile`, `make dev`, `make typecheck`, `make lint`, `make build`, `make start`, `make test`, `make lhci`. Biome owns formatting and linting. The static export is `out/`. Root requests redirect to `/en/`; `/ar/` is RTL. There is no API route or runtime server. Google Analytics 4 is opt-in: it is built only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, and gtag.js loads only after the visitor accepts the consent banner.

## Deploy

The repository is checked out separately at `/srv/storylens-website` on `ssh raseen` (production branch `main`). On that server run `make sync`. It installs and builds with Bun (no typecheck or lint) and atomically points `/var/www/storylens/current` to a new release under `/var/www/storylens/releases`. Nginx configuration is in `deploy/nginx/storylens.iscoded.com.conf`; `nginx -t` must pass before reload. The server has a dedicated Node LTS runtime at `/opt/storylens-node/bin`, on PATH only for website builds. This avoids a Bun 1.3.14 worker-shutdown crash observed on that server. Dependencies and all package scripts use Bun. The initial deployment obtains a Let’s Encrypt certificate using the webroot challenge. Cloudflare proxies the A record to the server.

There is no GitHub CI quality workflow; run checks locally. Every push to `main` rebuilds and deploys production. Auto-deploy requires the documented SSH secrets; absent those, run `ssh raseen 'cd /srv/storylens-website && make sync'`. PR previews are build artifacts, not public indexed sites. `make start` previews locally.

## Content

`design-system/MASTER.md` records the design decisions and tokens. Copy and legal claims are supported by `design-system/data-inventory.md`. Legal edits must update both MDX locales, version/date, and `design-system/legal-changelog.md`; review the final text before publishing. Source code uses PolyForm Noncommercial 1.0.0; commercial use requires permission.

CI deployment uses a dedicated restricted SSH key. It accepts only `deploy <main-commit>` and refuses commits that are not on `main`. Production requires `NEXT_PUBLIC_PRIVACY_EMAIL` in the server’s ignored `.env` file.
