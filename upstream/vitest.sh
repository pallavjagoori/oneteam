#!/usr/bin/env bash
# Runs a few Vue/JS spec files against the pinned Chatwoot release, with the
# new OneTeam specs from upstream/overlay/ copied in, and reports coverage for
# the files you name. Use it while writing tests; run-tests.sh does full runs.
#
# Usage: upstream/vitest.sh <source dir or file> [more ...]
#   e.g. upstream/vitest.sh app/javascript/dashboard/api
#
# Every spec under the given paths runs, and coverage covers the same paths.
# Needs the test image that run-tests.sh builds.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
VERSION="$(cat "$HERE/../CHATWOOT_VERSION")"
[ $# -gt 0 ] || { echo "Give at least one path under app/javascript" >&2; exit 2; }

# Apply the overlay: OneTeam's added specs live beside Chatwoot's own.
cp -r "$HERE/overlay/." "$HERE/chatwoot/"

includes=()
for path in "$@"; do
  path="${path%/}"
  if [ -d "$HERE/chatwoot/$path" ]; then
    includes+=("--coverage.include=$path/**/*.{js,vue}")
  else
    includes+=("--coverage.include=$path")
  fi
done

docker run --rm -v "$HERE/chatwoot/app:/chatwoot/app" "oneteam-chatwoot-tests:$VERSION" \
  sh -c 'TZ=UTC npx vitest --no-watch --no-cache --coverage --coverage.experimentalAstAwareRemapping \
    --coverage.reporter=text "$@"' vitest "${includes[@]}" \
    "--coverage.exclude=**/*.spec.js" "--coverage.exclude=**/specs/**" "$@"
