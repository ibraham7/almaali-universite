#!/usr/bin/env bash
# Deploys the latest commit of the configured branch. Does nothing when the
# server is already up to date, unless --force is passed.
set -euo pipefail

[ -f /etc/almaali-deploy.conf ] && . /etc/almaali-deploy.conf
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/almaali}"

exec 9>/var/lock/almaali-update.lock
flock -n 9 || { echo "في تحديث شغّال حالياً"; exit 0; }

cd "$APP_DIR"
git fetch -q origin "$BRANCH"
current="$(git rev-parse HEAD)"
latest="$(git rev-parse "origin/$BRANCH")"

if [ "$current" = "$latest" ] && [ "${1:-}" != "--force" ]; then
  exit 0
fi

echo "$(date '+%F %T') نشر $(git log -1 --format='%h %s' "$latest")"
git reset -q --hard "$latest"
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null
docker compose ps
