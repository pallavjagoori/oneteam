# Chatwoot code that no test can reach

Step 1.4 aims for 100% coverage of Chatwoot's code. A few lines and branches can't run with any input, because
other code rules out the case before it gets there. They are listed here instead of being tested, and they don't
need porting: the Laravel/Vue version can leave them out.

| File | Lines | Why it can't run |
| --- | --- | --- |
| `app/javascript/dashboard/helper/slaHelper.js` | 180 (false branch), 181 | The sort only sees a `null` threshold when the SLA is completed without a completion time. Then every status has a `null` threshold, so a `null` is never compared with a number. |
| `app/javascript/dashboard/helper/snoozeHelpers.js` | 26 (true branch) | `startOfWeek` is called without options, so weeks start on Sunday and the date is never a Monday. |
| `app/javascript/dashboard/helper/snoozeHelpers.js` | 93 (true branch) | `expandUnit` is only called with `h`, `m` or a unit already found in `UNIT_MAP`. |
| `app/javascript/dashboard/helper/snoozeHelpers.js` | 149 (`\|\| match`) | The regex only matches units that are all keys of `UNIT_SHORT`. |
| `app/javascript/dashboard/helper/auditlogHelper.js` | 105 (false branch) | `extractChangedAccountUserValues` always returns an object. |
| `app/javascript/dashboard/helper/emailQuoteExtractor.js` | 134 | Every text node sits inside the extractor's own wrapper `<div>`, so a block parent is always found. |
| `app/javascript/dashboard/helper/quotedEmailHelper.js` | 240–241, 272–273 | `getEmailDate` only returns valid dates, and `formatQuotedEmailDate` only returns `''` for invalid ones. |
| `app/javascript/dashboard/helper/editorHelper.js` | 394 (true branch) | ProseMirror's `create` always returns a node, so `imageNode` is never empty. |
| `app/javascript/dashboard/helper/editorHelper.js` | 563 (default case) | `createNode` is only called by `nodeCreators`, each with its own known type. |
| `app/javascript/dashboard/helper/snoozeDateParser/localization.js` | 233 (`\|\| {}`) | Every section name comes from `CACHE_SECTIONS`, and each has an English default. |
| `app/javascript/dashboard/helper/snoozeDateParser/localization.js` | 266 (`locale \|\| ''`) | The cache is only used when a locale other than `en` is set. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 205, 231–232 (null checks in durations) | The number and unit patterns are built from `WORD_NUMBER_MAP` and `UNIT_MAP`, so every match parses. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 213, 496, 515 (missing map entries) | The regexes only match names that have an entry in `HALF_UNIT_DURATIONS`, `TOD_HOUR_RANGE` and `TIME_OF_DAY_MAP`. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 353, 389, 399, 409, 430, 440, 457 (`!fn`) | Weekday indexes come from `WEEKDAY_MAP`, and `NEXT_WEEKDAY_FN` has all seven. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 582, 617 (`!isValid`) | `new Date(year, month, day)` with these numbers is always a valid date. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 693, 707, 722 (fall-through) | Each regex only captures the units the `if` chain already handles. |
| `app/javascript/dashboard/store/modules/conversations/helpers/filterHelpers.js` | 135 (`filterValue === 'all'`) | This line is inside `Array.isArray(filterValue)`, so an array never equals the string `'all'`. |
| `app/javascript/dashboard/store/modules/conversations/helpers/filterHelpers.js` | 143 (`!Array.isArray`) | The array case already returned on line 140, so this check is always true. |
| `app/javascript/dashboard/store/modules/conversations/helpers/filterHelpers.js` | 463 (`currentAndGroup.length > 0`) | The group always starts with one item and is reset to one item, so it is never empty. |
| `app/javascript/dashboard/store/modules/agentBots.js` | 76 (`return null`) | The `catch` calls `throwErrorMessage`, which always throws, so the code after the `try` only runs after `return response.data`. |
| `app/javascript/dashboard/store/modules/auth.js` | 93 (`currentAccount \|\| {}`) | `currentAccount` already defaults to `{}` in the destructuring above, so it is never falsy. |
| `app/javascript/dashboard/store/modules/summaryReports.js` | 29 (`if (!config) return`) | `fetchSummaryReports` is private and only called with `inbox`, `agent`, `team` or `label`, which all have a config. |
| `app/javascript/dashboard/composables/useWhatsappCallSession.js` | 237 (`if (!callId) return`) | `beaconTerminate` is only called by `sendWhatsappTerminateBeacon`, which returns first when there is no active call id. |
| `app/javascript/dashboard/composables/useCallSession.js` | 43 (`if (!store) return`) | The `beforeunload` listener is only added after the calls store is saved, and it is removed before the store is cleared, so the handler never runs without a store. |
| `app/javascript/dashboard/composables/usePolicy.js` | 60 (`if (!featureFlag) return true`) | `isPremiumFeature` is only reached with a flag: `shouldShow` checks `isFeatureFlagEnabled` first, which already returns true for a missing flag, and `shouldShowPaywall` returns early without one. |
| `app/javascript/dashboard/composables/usePolicy.js` | 65, 67 (`hasPremiumEnterprise` outside enterprise) | `hasPremiumEnterprise` is only read inside `if (isEnterprise)` branches, so its non-enterprise `return true` never runs. |
| `app/javascript/dashboard/composables/useDropdownPosition.js` | 38 (`if (!unref(enabled)) return 'top-full mt-2'`) | `verticalClass` is private and only read by `position` after `position` has already returned for a disabled dropdown. |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/ShowIntegration.vue` | All | Dead code: no route or component imports it, and it imports `./IntegrationHelpText.vue`, which Chatwoot has deleted, so it cannot even be compiled. The render smoke tests leave it out. |

## Backend

| File | Lines | Why it can't run |
| --- | --- | --- |
| `app/services/twilio/csat_template_service.rb` | 121–126 (`template_exists_in_config?`) | A private method that nothing calls. |
| `app/services/reporting_events/metric_registry.rb` | All | Dead code: nothing references `ReportingEvents::MetricRegistry`. Reports use `ReportingEvents::EventMetricRegistry` and `Reports::ReportMetricRegistry`, which hold the same tables. |
| `lib/tasks/annotate_rb.rake` | 5–7 | Loads the annotate_rb gem's tasks only in development, so it never runs under the test suite. A developer convenience that the port does not need. |
| `lib/tasks/reporting_events_rollup_timezone_setup.rake` | 92 (`rescue ArgumentError` in `utc_offset_in_seconds`) | The regex check just before it only lets digits through to `Integer(..., 10)`, so the conversion can never raise. |
| `lib/tasks/asset_clean.rake` | 19 (`define_task` fallback) | Only runs when no `assets:clean` task exists, but the asset pipeline always defines one. |
| `lib/test_data/database_optimizer.rb` | 27–30 (rest of `setup`) | Never reached: the UNLOGGED step before them fails on the current schema (see FINDINGS.md). |
| `app/jobs/webhooks/instagram_events_job.rb` | 114 (`sender_id`) | A private method that nothing calls; the lock key uses `contact_instagram_id`. |
| `lib/microsoft_graph_auth.rb` | 32, 38, 42–44, 53 (`extra`, `raw_info`, `authorize_params`, `callback_url`) | The OmniAuth strategy is never mounted as middleware; Chatwoot only instantiates it in `Microsoft::RefreshOauthTokenService` to reuse its OAuth2 client for token refresh, so the sign-in callbacks never run. |
| `app/helpers/api/v2/accounts/reports_helper.rb` | 69 (`report_builder`) | A private helper that nothing calls; each report builds its own summary builder. |
| `app/dashboards/account_dashboard.rb` | 25, 65, 89 (`else []`/`{}` branches) | Evaluated once when the class loads, and only on a community build; the test suite always loads the enterprise build. |
| `enterprise/app/controllers/enterprise/api/v1/accounts/conversations_controller.rb` | 28 (`copilot_params`) | A private method that nothing calls; copilot requests go through the copilot threads and messages controllers. |
| `app/models/kbase.rb` | All | Dead code: nothing references the `Kbase` namespace, so the module is never loaded. |
| `app/models/account.rb` | 135–140 (`all_conversation_tags`) | A method that nothing calls. |
| `lib/integrations/captain/processor_service.rb` | All | Dead code: nothing calls it and no integration app named `captain` exists. The old external Captain bot was replaced by the built-in Captain assistants. |
| `lib/integrations/slack/hook_builder.rb` | 28–30 (`hook_type`) | A private method that nothing calls; the hook type comes from the Slack app's config. |
| `lib/integrations/llm_instrumentation_spans.rb` | 12–35, 85–110 (`start_llm_turn_span`, `end_llm_turn_span` and their attribute helpers) | Nothing calls the LLM turn span methods; Captain records generations with `record_llm_generation` and `record_generation` instead. |
| `enterprise/app/services/captain/tools/base_service.rb` | All | Dead code: no class inherits from it. Captain's tools inherit from `Captain::Tools::BaseTool` (a `RubyLLM::Tool`) instead. |
| `enterprise/app/services/internal/account_analysis/threat_analyser_service.rb` | 39–41 (`rescue` in `extract_domain_from_email`) | The email is a non-blank string from the users table, and `String#split` cannot raise. |
| `enterprise/app/controllers/twilio/voice_controller.rb` | 79–81 (`twilio_to`) | A private method that nothing calls. |
| `enterprise/app/models/concerns/safe_endpoint_validatable.rb` | 79–82 (`validate_no_unicode_chars` adding its error) | `URI.parse` already rejects a non-ASCII host with `URI::InvalidURIError`, so such URLs fail as "must be a valid URL" before this check runs. |
| `enterprise/app/jobs/conversation_monitors/process_automation_delivery_job.rb` | 86–87 (`rescue ActiveRecord::RecordNotFound` in `eligible?`) | `eligible?` runs inside `delivery.with_lock`, which reloads the delivery and so reloads its rule and monitor; a deleted rule or monitor is then `nil` and returns `false` earlier. Only a deletion in the few microseconds between those queries reaches the rescue. |
| `enterprise/app/builders/captain/assistant_drilldown_builder.rb` | 62–63 (`raise ArgumentError` for an unsupported metric) | The only caller, `AssistantsController#drilldown`, returns 422 for unsupported metrics before building. |
| `enterprise/app/controllers/api/v1/accounts/whatsapp_calls_controller.rb` | 175–177 (`rescue ActiveRecord::RecordNotUnique` in `create_call_record`) | Only reachable when a webhook inserts the same call between the `find_by` and the `create!` a few lines apart; a race no request spec can schedule. |
| `app/services/reporting_events/metric_registry.rb` | All | Dead code: nothing refers to `ReportingEvents::MetricRegistry`. Reporting uses `ReportingEvents::EventMetricRegistry` and `Reports::ReportMetricRegistry` instead. |
| `app/jobs/migration/update_first_response_time_in_reporting_events_job.rb`, `add_search_indexes_job.rb`, `remove_stale_notifications_job.rb`, `backfill_companies_contacts_count_job.rb` | All | One-off data migration jobs whose migrations Chatwoot has since deleted: no migration, rake task or other code enqueues them any more. A fresh install never runs them, so the port can leave them out. |
| `enterprise/lib/captain/assistant_action_schema.rb`, `assistant_false_promise_schema.rb` | All | Dead code: nothing refers to `Captain::AssistantActionSchema` or `Captain::AssistantFalsePromiseSchema`, so Zeitwerk never loads them. |
| `app/models/channel/sms.rb` | 91–98 (`validate_provider_config`) | Its `before_save` callback is commented out and nothing else calls it. |
| `app/controllers/api/v1/accounts/portals_controller.rb` | 45 (`head :ok` in `archive`) | The line before always raises, because `archive` is not a portal attribute (see FINDINGS.md). |
| `lib/integrations/llm_base_service.rb` | All | Dead code: no class inherits from `Integrations::LlmBaseService` and nothing calls it. The AI features moved to Captain's own services. |
| `app/services/tiktok/message_service.rb` | 22 (`contact`), 111 (`sticker_message?`) | Private helpers that nothing calls: stickers are stored as unsupported messages through `supported_message?`, and the contact is read through `contact_inbox`. |
| `app/models/message.rb` | 425–428 (`mark_pending_conversation_as_open_for_human_response`) | In the community edition `captain_pending_conversation?` always returns false, so the method returns on its first line. The enterprise edition replaces both methods. |
| `app/javascript/dashboard/components-next/**/story/fixtures.js`, `components-next/filter/fixtures/filterTypes.js` | All | Sample data for the Histoire component stories. Only `*.story.vue` files import it, and those are not part of any app. The port needs no copy of it. |
| `app/javascript/entrypoints/dashboard.js` | All | Runs in the browser, but Vitest cannot load it: the `vuex-router-sync` package's `package.json` names a `main` file that the package does not ship. The other entrypoints are tested in `entrypoints/specs/`. The port replaces this bootstrap with its own. |
