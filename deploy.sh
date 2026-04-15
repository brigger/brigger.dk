#!/usr/bin/env bash
# brigger.dk — deploy static site to Hetzner VPS
# Usage: ./deploy.sh
#
# First-time setup (run once after DNS resolves):
#   ./deploy.sh --setup
# which:
#   1. rsyncs the site to /var/www/brigger.dk/
#   2. installs the nginx vhost and reloads nginx
#   3. runs certbot to issue a Let's Encrypt cert for brigger.dk + www

set -euo pipefail

VPS_HOST="root@95.217.222.205"
VPS_DIR="/var/www/brigger.dk"
ROOT="$(cd "$(dirname "$0")" && pwd)"
NGINX_SRC="$ROOT/../vps-infrastructure/nginx/brigger.dk.conf"

SETUP=0
if [ "${1:-}" = "--setup" ]; then SETUP=1; fi

# ----- sanity checks -----
if [ ! -d "$ROOT/photos/Yannick-web" ] || [ ! -f "$ROOT/photos/manifest.json" ]; then
  echo "Error: resized photos or manifest missing. Run ./scripts/optimize-photos.sh first." >&2
  exit 1
fi

echo "=== brigger.dk deployment ==="

# ----- sync site files -----
# Excludes originals (1.8 GB), local tooling, git metadata, OS cruft.
echo "→ rsync to $VPS_HOST:$VPS_DIR"
ssh "$VPS_HOST" "mkdir -p $VPS_DIR"
rsync -avz --delete \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude 'scripts/' \
  --exclude 'deploy.sh' \
  --exclude 'photos/Yannick/' \
  --exclude 'photos/README.md' \
  --exclude 'README.md' \
  "$ROOT/" "$VPS_HOST:$VPS_DIR/"

if [ $SETUP -eq 1 ]; then
  echo "→ installing nginx vhost"
  scp "$NGINX_SRC" "$VPS_HOST:/etc/nginx/sites-available/brigger.dk.conf"
  ssh "$VPS_HOST" bash -s <<'REMOTE'
    set -e
    ln -sf /etc/nginx/sites-available/brigger.dk.conf /etc/nginx/sites-enabled/brigger.dk.conf
    nginx -t
    systemctl reload nginx
    echo "→ requesting Let's Encrypt cert (brigger.dk + www.brigger.dk)"
    certbot --nginx --non-interactive --agree-tos \
      --redirect \
      -m patrick@getabstract.com \
      -d brigger.dk -d www.brigger.dk
REMOTE
fi

echo ""
echo "=== Done! ==="
echo "Live at: https://brigger.dk"
