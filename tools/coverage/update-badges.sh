#!/usr/bin/env bash
# Writes the README coverage badges from the latest full test runs.
#
# Usage: tools/coverage/update-badges.sh
#
# Reads upstream/results/frontend/lcov.info (Vitest) and
# upstream/results/backend/.resultset.json (SimpleCov), which
# upstream/run-tests.sh produces, and writes one shields.io endpoint file per
# suite to badges/. README.md shows them through img.shields.io, so the badges
# change as soon as the updated files reach main. A suite with no results is
# left as it is. Needs python3.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RESULTS="$ROOT/upstream/results"

python3 - "$RESULTS" "$ROOT/badges" <<'PY'
import json
import os
import sys

results, badges = sys.argv[1], sys.argv[2]


def colour(percent):
    """Shields.io colour for a coverage percentage."""
    for limit, name in ((100, 'brightgreen'), (90, 'green'), (75, 'yellowgreen'), (50, 'yellow'), (25, 'orange')):
        if percent >= limit:
            return name
    return 'red'


def write_badge(name, label, covered, total):
    percent = 100.0 * covered / total
    badge = {'schemaVersion': 1, 'label': label, 'message': f'{percent:.1f}%', 'color': colour(percent)}
    with open(os.path.join(badges, f'{name}.json'), 'w') as handle:
        json.dump(badge, handle, indent=2)
        handle.write('\n')
    print(f'{label}: {percent:.2f}% ({covered:,} of {total:,} lines)')


def frontend_lines(path):
    """Lines found (LF) and hit (LH), summed over every file in an lcov report."""
    found = hit = 0
    with open(path) as handle:
        for line in handle:
            if line.startswith('LF:'):
                found += int(line[3:])
            elif line.startswith('LH:'):
                hit += int(line[3:])
    return hit, found


def backend_lines(path):
    """Relevant (non-nil) and covered lines across every file SimpleCov tracked."""
    with open(path) as handle:
        resultset = json.load(handle)
    covered = total = 0
    for run in resultset.values():
        for coverage in run['coverage'].values():
            lines = [count for count in coverage['lines'] if count is not None]
            total += len(lines)
            covered += sum(1 for count in lines if count > 0)
    return covered, total


os.makedirs(badges, exist_ok=True)
frontend = os.path.join(results, 'frontend', 'lcov.info')
backend = os.path.join(results, 'backend', '.resultset.json')
if os.path.exists(frontend):
    write_badge('chatwoot-frontend-coverage', 'Chatwoot frontend coverage', *frontend_lines(frontend))
if os.path.exists(backend):
    write_badge('chatwoot-backend-coverage', 'Chatwoot backend coverage', *backend_lines(backend))
PY
