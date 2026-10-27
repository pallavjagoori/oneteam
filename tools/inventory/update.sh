#!/usr/bin/env bash
# Rebuilds docs/inventory for one Chatwoot release.
#
# Usage: tools/inventory/update.sh v4.19.1
#
# Needs git, Docker and PHP 8.3+. It clones the Chatwoot tag, boots the
# matching official Docker image against throwaway Postgres and Redis
# containers to list every HTTP route, then runs build-inventory.php.
set -euo pipefail

VERSION="${1:?Give a Chatwoot tag, e.g. v4.19.1}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"
NET="inventory-$$"

cleanup() {
  docker rm -f "$NET-pg" "$NET-redis" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$VERSION" https://github.com/chatwoot/chatwoot.git "$WORK/chatwoot"

# `rails routes` boots the whole app, which needs a migrated database and Redis.
docker network create "$NET" >/dev/null
docker run -d --name "$NET-redis" --network "$NET" redis:7-alpine >/dev/null
docker run -d --name "$NET-pg" --network "$NET" \
  -e POSTGRES_USER=pg -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=cw pgvector/pgvector:pg16 >/dev/null
until docker exec "$NET-pg" pg_isready -U pg >/dev/null 2>&1; do sleep 1; done

docker run --rm --network "$NET" \
  -e SECRET_KEY_BASE=inventory -e RAILS_ENV=production \
  -e DATABASE_URL="postgres://pg:pg@$NET-pg/cw" -e REDIS_URL="redis://$NET-redis:6379" \
  "chatwoot/chatwoot:$VERSION" \
  sh -c 'bundle exec rails db:chatwoot_prepare >/dev/null 2>&1 && bundle exec rails routes' \
  > "$WORK/routes.txt"

php "$ROOT/tools/inventory/build-inventory.php" \
  --source="$WORK/chatwoot" \
  --routes="$WORK/routes.txt" \
  --out="$ROOT/docs/inventory"

echo "$VERSION" > "$ROOT/CHATWOOT_VERSION"
