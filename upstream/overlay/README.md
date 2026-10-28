# Overlay: OneTeam's added Chatwoot tests

Step 1.4 of the [plan](../../docs/plan.md) brings Chatwoot's own code to 100% test coverage. The new tests live
here, in the same folders they would have inside Chatwoot, so Chatwoot's repository stays untouched and each new
release can be tested with the same files.

- Every file mirrors a Chatwoot path. `overlay/app/javascript/dashboard/api/specs/x.oneteam.spec.js` is copied to
  `app/javascript/dashboard/api/specs/x.oneteam.spec.js` in the Chatwoot clone.
- The `.oneteam.spec.js` suffix keeps our files apart from Chatwoot's own `.spec.js` files, so a new Chatwoot
  release can never overwrite them, and it is easy to see which tests are ours.
- `run-tests.sh` copies the overlay in before it builds the test image. `OVERLAY=0 run-tests.sh` skips it, to
  measure Chatwoot's tests alone.
- `vitest.sh <path>` runs only the specs under one folder and reports coverage for that folder. Use it while
  writing tests.

## Shared helpers

- `app/javascript/dashboard/api/specs/oneteamAxiosMock.js`: `useAxiosMock()` swaps `window.axios` for a mock
  for each test and puts the browser on an account page, so API clients build `/api/v1/accounts/1/...` URLs.

## Two lists kept alongside the tests

- [UNREACHABLE.md](UNREACHABLE.md): lines that no input can reach. They count against 100% but can't be tested,
  and the port can leave them out.
- [FINDINGS.md](FINDINGS.md): bugs and odd behaviour found in Chatwoot. The tests pin today's behaviour; the port
  decides whether to copy or fix each one.

## Progress

| Folder | Coverage |
| --- | --- |
| `app/javascript/dashboard/api` | 100% statements, branches, functions and lines |
| `app/javascript/dashboard/helper` | In progress: 95.8% of lines, 93.5% of branches (was 87% of lines) |

With the overlay, the full Vitest run has 5,541 passing tests and 37.8% line coverage (37.3% without it).
