#!/usr/bin/env bash
# Runs the pinned Chatwoot release's own test suites and collects coverage.
#
# Usage: upstream/run-tests.sh [frontend|backend|all]   (default: all)
#
# Behind a proxy, set HTTP(S)_PROXY, and also BUILD_NETWORK=host if the proxy
# listens on the host's loopback, and EXTRA_CA_CERT=<file> if it re-signs TLS.
#
# Results land in upstream/results/:
#   frontend/lcov.info, frontend/summary.txt   Vitest with v8 coverage
#   backend/.resultset.json, backend/rspec.txt  RSpec with SimpleCov
set -euo pipefail

SUITE="${1:-all}"
HERE="$(cd "$(dirname "$0")" && pwd)"
VERSION="$(cat "$HERE/../CHATWOOT_VERSION")"
export CHATWOOT_VERSION="$VERSION"

# Fetch the pinned release next to this script; it is git-ignored.
if [ ! -d "$HERE/chatwoot" ]; then
  git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$VERSION" \
    https://github.com/chatwoot/chatwoot.git "$HERE/chatwoot"
fi

# Add OneTeam's own Chatwoot specs (see overlay/README.md). OVERLAY=0 measures
# Chatwoot's tests alone, as released.
if [ "${OVERLAY:-1}" != "0" ]; then
  cp -r "$HERE/overlay/." "$HERE/chatwoot/"
fi

mkdir -p "$HERE/results" "$HERE/certs"
rm -f "$HERE/certs/"*.crt
if [ -n "${EXTRA_CA_CERT:-}" ]; then
  cp "$EXTRA_CA_CERT" "$HERE/certs/extra.crt"
fi
export http_proxy="${http_proxy:-${HTTP_PROXY:-}}" https_proxy="${https_proxy:-${HTTPS_PROXY:-}}"
cd "$HERE"
trap 'docker compose down --volumes >/dev/null 2>&1' EXIT
# Built with plain `docker build` because Compose refuses --network host without extra flags.
docker build --network "${BUILD_NETWORK:-default}" \
  --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg NO_PROXY \
  --build-arg http_proxy --build-arg https_proxy --build-arg no_proxy \
  -f Dockerfile.test -t "oneteam-chatwoot-tests:$VERSION" .

if [ "$SUITE" = "frontend" ] || [ "$SUITE" = "all" ]; then
  # The Vue tests need no services, so they run in a plain container.
  docker run --rm -v "$HERE/results:/results" "oneteam-chatwoot-tests:$VERSION" sh -c '
    TZ=UTC npx vitest --no-watch --no-cache --coverage --coverage.experimentalAstAwareRemapping \
      > /results/frontend-run.txt 2>&1; status=$?
    mkdir -p /results/frontend && cp -r coverage/. /results/frontend/
    exit $status'
fi

if [ "$SUITE" = "backend" ] || [ "$SUITE" = "all" ]; then
  docker compose run --rm tests sh -c '
    bundle exec rails db:create db:schema:load > /dev/null
    bundle exec rspec -I ./spec --require coverage_helper --require spec_helper --format progress \
      > /results/backend-run.txt 2>&1; status=$?
    mkdir -p /results/backend && cp -r coverage/. /results/backend/
    exit $status'
fi

