#!/bin/bash
# Runs the contract tests against the pinned Chatwoot release.
#
#   contract/run.sh            start Chatwoot, run the tests, stop Chatwoot
#   contract/run.sh --keep     leave Chatwoot running afterwards
#   CONTRACT_RECORD=1 contract/run.sh   rewrite the recorded snapshots
#
# Needs Docker, PHP 8.3 and `composer install` at the repository root, plus the
# oneteam-chatwoot-tests image (built by upstream/run-tests.sh).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
export CHATWOOT_VERSION="$(cat "$ROOT/CHATWOOT_VERSION")"
COMPOSE=(docker compose -p oneteam-contract -f "$HERE/docker-compose.yml")

keep=false
if [ "${1:-}" = "--keep" ]; then keep=true; shift; fi
$keep || trap '"${COMPOSE[@]}" down --volumes >/dev/null 2>&1' EXIT

"${COMPOSE[@]}" up -d --wait web worker sink

export CONTRACT_BASE_URL="${CONTRACT_BASE_URL:-http://localhost:3000}"
export CONTRACT_SINK_URL="${CONTRACT_SINK_URL:-http://localhost:8025}"
cd "$ROOT"
vendor/bin/pest --configuration=contract/phpunit.xml --test-directory=contract/tests "$@"
