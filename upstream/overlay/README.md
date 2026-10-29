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
- Backend specs end in `_oneteam_spec.rb` and live under `overlay/spec/`, mirroring Chatwoot's `spec/` folders.
  `rspec.sh <spec files> -- <source files>` runs them and lists the source lines still uncovered.

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
| `app/javascript/dashboard/helper` | Done: 100% of functions, 99.8% of lines, 98.5% of branches. The rest is listed in UNREACHABLE.md |
| `app/javascript/dashboard/store` (Vuex modules, Captain, factory, utils) | Done: 99.97% of lines, 99.6% of branches. The rest is listed in UNREACHABLE.md |
| `app/javascript/dashboard/stores` | 100% statements, branches, functions and lines |
| `app/javascript/dashboard/composables` | Done: 100% of functions, 99.95% of lines, 99.5% of branches. The rest is listed in UNREACHABLE.md |

With the overlay (api, helper, store, stores and composables done), the full Vitest run has 6,442 passing
tests and 41.9% line coverage (37.3% without it). Nearly all of what is left is in Vue components:
`components-next`, `routes` and `components`.

### Backend

Chatwoot's RSpec suite reaches 86.9% of lines once its broken specs are patched (see
[patches/README.md](../patches/README.md)). Two things hid how much was untested:

- About 130 MFA and encrypted-credential specs skip themselves unless Active Record encryption keys are set.
  Chatwoot runs them in a separate CI job; `docker-compose.yml` now sets the same test keys for every run.
- SimpleCov did not track `enterprise/`, so 54 enterprise files that no spec loads were missing from the
  report. A patch now tracks them, so they count as 0% until tested.

New specs so far cover every controller that had no spec at all, including WhatsApp manual setup, Captain
tasks, company conversations, notes and enrichment, the Captain Overview report and drilldowns, Shopify
reconnect, the Stripe app and Twitter webhooks, help center search and custom domain verification.

Captain Copilot workflows (the `copilot_workflows` flag: turns, saved collections, reviews, approvals and their
jobs) had almost no specs. They are now at 100% of their 1,409 lines.

Two shared helpers in `spec/support/`:

- `oneteam_copilot_helpers.rb` builds Copilot state the way the tools do: a running turn, a saved collection, a
  review and a change awaiting approval.
- `oneteam_fake_llm.rb` (`include_context 'with a fake OpenAI-compatible model'`) points RubyLLM at a fake
  endpoint through WebMock and queues the model's replies. Specs using it run Captain's real request building and
  response parsing, so they double as contract tests for the port.

