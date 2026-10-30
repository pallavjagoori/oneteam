#!/usr/bin/env bash
# Prepares the Chatwoot clone for a test run. vitest.sh, rspec.sh and
# run-tests.sh call it, so every run sees the same files.
#
# 1. Copies OneTeam's added specs from overlay/ into the clone. Only the code
#    folders are copied; the overlay's own docs (README.md and the lists next
#    to it) stay out of Chatwoot's tree.
# 2. Applies each patches/*.patch. A patch fixes a broken test in Chatwoot's
#    own suite; patches/README.md says why each one exists. A patch that is
#    already applied is skipped. One that no longer applies (because a new
#    Chatwoot release changed the file) stops the run, so it gets reviewed.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
CLONE="$HERE/chatwoot"

for dir in "$HERE"/overlay/*/; do
  cp -r "$dir" "$CLONE/"
done

for patch in "$HERE"/patches/*.patch; do
  [ -e "$patch" ] || continue
  if git -C "$CLONE" apply --reverse --check "$patch" 2>/dev/null; then
    continue
  fi
  if ! git -C "$CLONE" apply "$patch"; then
    echo "Patch $(basename "$patch") no longer applies to this Chatwoot release; see patches/README.md" >&2
    exit 1
  fi
done
