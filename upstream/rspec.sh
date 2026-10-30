#!/usr/bin/env bash
# Runs a few RSpec files against the pinned Chatwoot release, with the new
# OneTeam specs from upstream/overlay/ copied in, and reports line coverage for
# the Ruby files you name. Use it while writing tests; run-tests.sh does full
# runs.
#
# Usage: upstream/rspec.sh <spec file or dir>... [-- <source file or dir>...]
#   e.g. upstream/rspec.sh spec/services/search_service_spec.rb -- app/services/search_service.rb
#
# Everything before `--` goes to rspec (so `file_spec.rb:42` works). The paths
# after `--` choose which files the coverage list shows. Needs the test image
# that run-tests.sh builds, and starts the same Postgres, Redis and OpenSearch.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
VERSION="$(cat "$HERE/../CHATWOOT_VERSION")"
export CHATWOOT_VERSION="$VERSION"

specs=()
sources=()
seen_separator=0
for arg in "$@"; do
  if [ "$arg" = "--" ]; then seen_separator=1; continue; fi
  if [ $seen_separator = 1 ]; then sources+=("$arg"); else specs+=("$arg"); fi
done
[ ${#specs[@]} -gt 0 ] || { echo "Give at least one spec path" >&2; exit 2; }

# Apply the overlay and patches (see apply-overlay.sh).
"$HERE/apply-overlay.sh"

OUT="$HERE/results/rspec-sh"
rm -rf "$OUT" && mkdir -p "$OUT"
cd "$HERE"
trap 'docker compose down --volumes >/dev/null 2>&1' EXIT

# Mount the Ruby source folders so edits apply without rebuilding the image.
mounts=()
for dir in app enterprise lib spec config; do
  mounts+=(-v "$HERE/chatwoot/$dir:/chatwoot/$dir")
done

status=0
docker compose run --rm "${mounts[@]}" -v "$OUT:/out" tests sh -c '
  bundle exec rails db:create db:schema:load > /dev/null
  bundle exec rspec -I ./spec --require coverage_helper --require spec_helper --format progress "$@"
  status=$?
  cp coverage/.resultset.json /out/ 2>/dev/null
  exit $status' rspec "${specs[@]}" || status=$?

# List the chosen source files that are below 100%, with their uncovered lines.
if [ ${#sources[@]} -gt 0 ] && [ -f "$OUT/.resultset.json" ]; then
  echo
  echo "Files below 100% (uncovered lines):"
  python3 - "$OUT/.resultset.json" "${sources[@]}" <<'PY'
import json, sys
resultset, *paths = sys.argv[1:]
prefixes = ["/chatwoot/" + p.rstrip("/") for p in paths]
files = next(iter(json.load(open(resultset)).values()))["coverage"]
total = covered = 0
for path in sorted(files):
    if not any(path == p or path.startswith(p + "/") for p in prefixes):
        continue
    info = files[path]
    lines = info["lines"] if isinstance(info, dict) else info
    missed = [str(i + 1) for i, hits in enumerate(lines) if hits == 0]
    total += sum(1 for hits in lines if hits is not None)
    covered += sum(1 for hits in lines if hits)
    if missed:
        print(f"  {path.removeprefix('/chatwoot/')} | {' '.join(missed)}")
print(f"Lines: {100 * covered / total if total else 100:.2f}% ({covered}/{total})")
PY
fi
exit $status
