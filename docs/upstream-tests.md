# Running Chatwoot's own tests

`upstream/` runs the test suites of the Chatwoot release in [`CHATWOOT_VERSION`](../CHATWOOT_VERSION) and collects
their coverage. This is step 1.3 of the [plan](plan.md): it tells us how much of Chatwoot's behaviour its own tests
already pin down, feature by feature.

## Running it

```sh
upstream/run-tests.sh            # both suites
upstream/run-tests.sh frontend   # Vitest only (about 6 minutes)
upstream/run-tests.sh backend    # RSpec only (about 40 minutes)
upstream/vitest.sh app/javascript/dashboard/api   # one folder's Vue specs and coverage
php tools/coverage/coverage-by-feature.php   # writes docs/coverage/
```

You need Docker. The script clones the pinned Chatwoot tag into `upstream/chatwoot/`, builds a test image
(`upstream/Dockerfile.test`: Ruby 3.4.4, Node 24, pnpm 10 and the full gem bundle) and starts Postgres with pgvector,
Redis and OpenSearch, which is the same set of services Chatwoot's CircleCI uses.

The script adds OneTeam's own Chatwoot tests from [`upstream/overlay`](../upstream/overlay/README.md) before it
runs. Set `OVERLAY=0` to run Chatwoot's tests exactly as released.

Results land in `upstream/results/`, which git ignores:

| File | What it is |
| --- | --- |
| `frontend-run.txt` | Vitest output, including the per-file coverage table |
| `frontend/lcov.info` | Vue and JS coverage in lcov format |
| `backend-run.txt` | RSpec output, including every failure |
| `backend/.resultset.json` | Ruby coverage from SimpleCov |

### Behind a proxy

If your network sends traffic through a proxy, set `HTTP_PROXY` and `HTTPS_PROXY`. If the proxy listens on the
host's loopback, also set `BUILD_NETWORK=host`. If it re-signs TLS, set `EXTRA_CA_CERT=<path to its CA file>`. The
image installs no apt packages, so the build only needs Docker Hub, rubygems.org, registry.npmjs.org and GitHub.

## Two adjustments to match Chatwoot's CI

- **OpenSearch on localhost.** Chatwoot's specs use WebMock, which blocks every real network call except to
  localhost. Chatwoot's CI runs OpenSearch on localhost, so the tests container shares OpenSearch's network.
- **`example.com` is pinned in the hosts file.** A few specs check that a URL's host resolves to a public address
  before WebMock answers the request. Pinning the host lets those specs pass on networks without outbound DNS.

Without these two adjustments, 97 specs fail for environment reasons alone.

## How frontend coverage is measured

Chatwoot pins Vitest 3.0, whose V8 coverage maps Vue single-file components loosely. A component that a test only
imports, without rendering it, shows as almost fully covered. With Chatwoot's own setup the suite reports 73.6% of
lines covered. For example, `SearchTabs.vue` shows as 97% covered, although no test renders it.

The test image therefore upgrades the test runner, and nothing else, to Vitest 3.2.4. It also turns on
`experimentalAstAwareRemapping`, which counts real statements. All 5,251 tests still pass, and coverage drops to
**37.3%** of 54,172 executable lines. That is the honest baseline. 401 files are never loaded by any test.

We also tried the Istanbul provider. It aborts, because it compiles every file, and two Chatwoot files fail to
compile in tests:

- `settings/integrations/ShowIntegration.vue` imports `./IntegrationHelpText.vue`, which doesn't exist. Nothing
  imports `ShowIntegration.vue`, so it is dead code.
- `entrypoints/dashboard.js` imports `vuex-router-sync`, which isn't installed in the test setup.

## Results for v4.19.1

| Suite | Tests | Failures | Line coverage |
| --- | ---: | ---: | ---: |
| Vitest (Vue and JS) | 5,251 in 513 files | 0 | 37.3% |
| RSpec (Ruby) | 11,114 examples (131 pending) | 14 | 86.9% |

Coverage per feature, with every file below 100%, is in [`docs/coverage`](coverage/README.md).

The 14 RSpec failures still occur after the adjustments above, and their errors don't point at the test setup.
They need investigating before step 1.4, because a test that fails at the pinned release can't serve as a reference:

- `spec/enterprise/controllers/twilio/voice_controller_spec.rb`: 9 examples. Outside-hours calls get no `<Say>`
  reply, and calls with a withheld number create no `Call` record.
- `spec/enterprise/models/inbox_spec.rb`: 3 examples (lines 267, 309, 361).
- `spec/services/search_service_spec.rb:627`: `SEARCH_TIME_RANGE_LIMIT_DAYS` lookback (`private method 'load'
  called for an instance of Array`).
- `spec/builders/agent_builder_spec.rb:47`: it passed when re-run alone, so it probably depends on test order.
