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

OUT="$HERE/results/vitest-sh"
rm -rf "$OUT" && mkdir -p "$OUT"
status=0
docker run --rm -v "$HERE/chatwoot/app:/chatwoot/app" -v "$OUT:/out" \
  "oneteam-chatwoot-tests:$VERSION" \
  sh -c 'TZ=UTC npx vitest --no-watch --no-cache --coverage --coverage.experimentalAstAwareRemapping \
    --coverage.reporter=text-summary --coverage.reporter=lcovonly --coverage.reportsDirectory=/out/coverage "$@"' vitest "${includes[@]}" \
    "--coverage.exclude=**/*.spec.js" "--coverage.exclude=**/specs/**" "$@" || status=$?

# List every file still below 100%, with full paths and the uncovered lines
# and branch lines, read from lcov (the text table cuts long names short).
echo
echo "Files below 100% (uncovered lines | lines with an uncovered branch | functions never run):"
awk -F'[:,]' '
  /^SF:/ { file = $2; lines = ""; branches = ""; fns = "" }
  /^FN:/ { fnline[$3] = $2 }
  /^FNDA:0,/ { fns = fns " " fnline[$3] }
  /^DA:/ && $3 == 0 { lines = lines " " $2 }
  /^BRDA:/ && ($5 == "-" || $5 == 0) && !(($2) in seen) { seen[$2]; branches = branches " " $2 }
  /^end_of_record/ {
    if (lines != "" || branches != "" || fns != "") printf "  %s |%s |%s |%s\n", file, lines, branches, fns
    delete seen; delete fnline
  }
' "$OUT/coverage/lcov.info"
exit $status
