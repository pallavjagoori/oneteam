# Patches: fixes to Chatwoot's own test suite

A few of Chatwoot's own specs fail on the pinned release for reasons that have nothing to do with the code they
test. Each patch here fixes one such spec, the smallest change that makes it test what it says it tests.
`apply-overlay.sh` applies them before every run. One more patch fixes how coverage is measured, not a spec.

Patches only ever touch Chatwoot's spec files, never its application code. Bugs in the application code go to
[FINDINGS.md](../overlay/FINDINGS.md) instead, and the tests pin the current behaviour.

On a new Chatwoot release, a patch that no longer applies stops the run. Check whether Chatwoot fixed the spec
itself (then delete the patch) or changed it (then remake the patch).

| Patch | Spec | Why it fails as released | Fix |
| --- | --- | --- | --- |
| `twilio-voice-controller-spec-signs-requests.patch` | `spec/enterprise/controllers/twilio/voice_controller_spec.rb` | Nine examples post to the voice webhook without a Twilio signature. The controller rejects unsigned requests with 403, as the spec's own signature tests require, so the examples never reach the code they check. | Send those requests through the spec's existing `post_twilio_webhook` helper, which signs them. |
| `search-service-spec-time-range-stub.patch` | `spec/services/search_service_spec.rb` | The `SEARCH_TIME_RANGE_LIMIT_DAYS` example stubs `Message.search` to return a plain array. The service calls `.load` on the result, which is private on `Array`, so the example raises `NoMethodError`. | Return the `search_results` double that the other examples in the file use. |
| `message-tracking-spec-cleans-audits.patch` | `spec/enterprise/models/conversation_monitors/message_tracking_spec.rb` | The spec turns off transactional tests so two database connections can see its records. Its cleanup deletes the records but not the audit log rows (enterprise auditing) they create. Those rows outlive the spec, so the later audit-log examples in `spec/enterprise/models/inbox_spec.rb` count 9 inbox audits instead of 1 and fail in a full run. | Note the last audit id before each example and delete newer audits in the cleanup. |
| `agent-builder-spec-resets-current.patch` | `spec/builders/agent_builder_spec.rb` | `AccountBuilder` sets `Current.account`, and nothing resets it between non-request examples. In a full run `account_builder_spec.rb` runs just before, so the invitation mail is enqueued with an account from a rolled-back example. The mail's arguments can't be loaded back and `have_enqueued_mail` fails. | Reset `Current` before each example. |
| `coverage-helper-tracks-enterprise.patch` | `spec/coverage_helper.rb` | SimpleCov's `rails` profile only tracks `app/` and `lib/`. An enterprise file that no spec loads is left out of the report instead of counting as 0%, so 54 untested enterprise files were invisible. | Track `enterprise/app` and `enterprise/lib` as well. |
