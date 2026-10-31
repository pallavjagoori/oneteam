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

- `app/javascript/specs/oneteam/renderHarness.js`: the render smoke harness (see below).

## Render smoke tests (Vue components)

`app/javascript/specs/oneteam/*Smoke.oneteam.spec.js` mount every Vue component in the dashboard, widget,
survey, v3 login, portal, super admin and shared folders, one test per component. Each component is mounted
the way its app would mount it: with the app's real Vuex store in its empty state, Pinia, a memory router on
account 1, i18n and FloatingVue. Child components are stubbed, and network calls never answer, so each
component renders its loading or empty state. Required props get a value of their declared type. Object props
get a "lenient" object that tolerates any property access.

A smoke test fails when the component throws while rendering or mounting. It proves the component and
everything it imports load and render. It does **not** check behaviour; behaviour specs sit next to the
components, and those are still needed for real coverage of what a component does.

Components that cannot render without realistic data get it from the spec: `propsFor` gives a message bubble
its attachment or a calendar its dates, and `setupFor` provides the parent context a component reads (the
sidebar, a dropdown, the tabs, the open conversation, the signed-in administrator). A component that still
can't render can be listed in `needsDedicatedSpec` with the reason, and shows up as a `todo` test until it gets
its own spec; today that list is empty. New Chatwoot components are picked up automatically on the next
release.

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

With the overlay (api, helper, store, stores and composables done, plus the render smoke tests), the full
Vitest run has 8,427 passing tests, none todo, and 70.1% line coverage (37.3% without the overlay; 41.9% before
the smoke tests). What is left is the behaviour of Vue components: event handlers, watchers and the branches
that only run with real data, mostly in `components-next`, `routes` and `components`.

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

Shared helpers in `spec/support/`:

- `oneteam_copilot_helpers.rb` builds Copilot state the way the tools do: a running turn, a saved collection, a
  review and a change awaiting approval.
- `oneteam_fake_llm.rb` (`include_context 'with a fake OpenAI-compatible model'`) points RubyLLM at a fake
  endpoint through WebMock and queues the model's replies. Specs using it run Captain's real request building and
  response parsing, so they double as contract tests for the port.
- `oneteam_langfuse_tracing.rb` (`include_context 'with Langfuse tracing'`) turns on Langfuse tracing and keeps
  the OpenTelemetry spans in memory, so specs can check the span names and attributes Langfuse receives.

