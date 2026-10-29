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

## Backend

| File | Lines | Why it can't run |
| --- | --- | --- |
| `app/services/twilio/csat_template_service.rb` | 121–126 (`template_exists_in_config?`) | A private method that nothing calls. |
| `lib/integrations/captain/processor_service.rb` | All | Dead code: nothing calls it and no integration app named `captain` exists. The old external Captain bot was replaced by the built-in Captain assistants. |
| `lib/integrations/slack/hook_builder.rb` | 28–30 (`hook_type`) | A private method that nothing calls; the hook type comes from the Slack app's config. |
| `lib/integrations/llm_instrumentation_spans.rb` | 12–35, 85–110 (`start_llm_turn_span`, `end_llm_turn_span` and their attribute helpers) | Nothing calls the LLM turn span methods; Captain records generations with `record_llm_generation` and `record_generation` instead. |
| `enterprise/app/services/captain/tools/base_service.rb` | All | Dead code: no class inherits from it. Captain's tools inherit from `Captain::Tools::BaseTool` (a `RubyLLM::Tool`) instead. |
| `enterprise/app/services/internal/account_analysis/threat_analyser_service.rb` | 39–41 (`rescue` in `extract_domain_from_email`) | The email is a non-blank string from the users table, and `String#split` cannot raise. |
| `enterprise/app/controllers/twilio/voice_controller.rb` | 79–81 (`twilio_to`) | A private method that nothing calls. |
| `enterprise/app/models/concerns/safe_endpoint_validatable.rb` | 79–82 (`validate_no_unicode_chars` adding its error) | `URI.parse` already rejects a non-ASCII host with `URI::InvalidURIError`, so such URLs fail as "must be a valid URL" before this check runs. |
| `enterprise/app/jobs/conversation_monitors/process_automation_delivery_job.rb` | 86–87 (`rescue ActiveRecord::RecordNotFound` in `eligible?`) | `eligible?` runs inside `delivery.with_lock`, which reloads the delivery and so reloads its rule and monitor; a deleted rule or monitor is then `nil` and returns `false` earlier. Only a deletion in the few microseconds between those queries reaches the rescue. |
| `enterprise/app/builders/captain/assistant_drilldown_builder.rb` | 62–63 (`raise ArgumentError` for an unsupported metric) | The only caller, `AssistantsController#drilldown`, returns 422 for unsupported metrics before building. |
