#!/usr/bin/env bash
set -euo pipefail
# Run inside the standalone server checkout after cloning this repository.
cd "$(dirname "$0")/.."
export PATH="/opt/storylens-node/bin:$PATH"
command -v node >/dev/null || { echo "Install a supported Node LTS runtime for Next.js; Bun still manages dependencies and scripts."; exit 1; }
set -a
if [ -f .env ]; then source .env; fi
set +a
[ -n "${NEXT_PUBLIC_PRIVACY_EMAIL:-}" ] || { echo "Set the approved private contact address in .env before publication."; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "Deploy as root to manage nginx and releases."; exit 1; }
exec 9>/var/lock/storylens-website-deploy.lock
flock -n 9 || { echo "Another website deploy is running."; exit 1; }
bun install --frozen-lockfile
bun run build
release="/var/www/storylens/releases/$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
mkdir -p "$release" /var/www/certbot
cp -a out/. "$release/"
chmod -R a+rX "$release"
previous="$(readlink /var/www/storylens/current || true)"
ln -s "$release" /var/www/storylens/current.next
mv -Tf /var/www/storylens/current.next /var/www/storylens/current
config=/etc/nginx/sites-available/storylens.iscoded.com.conf
if [ -f "$config" ]; then cp "$config" "$config.previous"; fi
rollback() {
 if [ -n "$previous" ]; then ln -sfn "$previous" /var/www/storylens/current; fi
 if [ -f "$config.previous" ]; then cp "$config.previous" "$config"; fi
}
if [ ! -f /etc/letsencrypt/live/storylens.iscoded.com/fullchain.pem ]; then
 cp deploy/nginx/bootstrap.conf "$config"
 ln -sfn "$config" /etc/nginx/sites-enabled/storylens.iscoded.com.conf
 nginx -t || { rollback; exit 1; }
 systemctl reload nginx
 certbot certonly --webroot -w /var/www/certbot -d storylens.iscoded.com --non-interactive --agree-tos --register-unsafely-without-email || { rollback; exit 1; }
fi
cp deploy/nginx/storylens.iscoded.com.conf "$config"
ln -sfn "$config" /etc/nginx/sites-enabled/storylens.iscoded.com.conf
nginx -t || { rollback; exit 1; }
systemctl reload nginx
curl --noproxy "*" --connect-timeout 5 --max-time 15 --fail --silent --show-error --retry 5 --retry-delay 1 --retry-all-errors --resolve storylens.iscoded.com:443:127.0.0.1 https://storylens.iscoded.com/en/ >/dev/null || { rollback; nginx -t && systemctl reload nginx; exit 1; }
echo "Deployed $release"
