# Story Lens website

English and Arabic website for the Story Lens browser extension, with an original interactive reading demo, optional GSAP/Three.js visuals, privacy policy, and terms.

Production: https://storylens.iscoded.com · [Extension](https://github.com/Hussain7Abbas/storylens-extension) · [Desktop companion](https://github.com/Hussain7Abbas/storylens-client)

## Develop

Use Bun 1.3.6 or newer. `bun install --frozen-lockfile`, `make dev`, `make typecheck`, `make lint`, `make build`, `make start`, `make test`, `make lhci`. Biome owns formatting and linting. The static export is `out/`. Root requests redirect to `/en/`; `/ar/` is RTL. There is no analytics, API route, or runtime server.

## Deploy

The repository is checked out separately at `/srv/storylens-website` on `ssh raseen` (production branch `main`). On that server run `make sync`. It builds with Bun and atomically points `/var/www/storylens/current` to a new release under `/var/www/storylens/releases`. Nginx configuration is in `deploy/nginx/storylens.iscoded.com.conf`; `nginx -t` must pass before reload. The initial deployment obtains a Let’s Encrypt certificate using the webroot challenge. Cloudflare proxies the A record to the server.

GitHub CI validates main/develop and pull requests. Production auto-deploy requires the documented SSH secrets; absent those, run `ssh raseen 'cd /srv/storylens-website && make sync'`. PR previews are build artifacts, not public indexed sites. `make start` previews locally.

## Content

`design-system/MASTER.md` records the design decisions and tokens. Copy and legal claims are supported by `design-system/data-inventory.md`. Legal edits must update both MDX locales, version/date, and `design-system/legal-changelog.md`; review the final text before publishing. Source code uses PolyForm Noncommercial 1.0.0; commercial use requires permission.
