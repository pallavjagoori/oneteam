# Captain AI assistant and copilot

**Area:** AI

AI assistants that answer customers from documents and FAQs, agent copilot, scenarios, custom tools and AI reply suggestions.

**Feature flags:** `custom_tools`, `help_center_embedding_search`, `captain_integration`, `chatwoot_v4`, `captain_v1_action_classifier`, `captain_integration_v2`, `captain_document_auto_sync`, `captain_tasks`, `captain_classifier`, `copilot_workflows`

## HTTP routes (82)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/captain/toolsets/install(.:format)` | `redirect(302)` |
| GET | `/api/v1/accounts/:account_id/captain/preferences(.:format)` | `api/v1/accounts/captain/preferences#show` |
| PATCH | `/api/v1/accounts/:account_id/captain/preferences(.:format)` | `api/v1/accounts/captain/preferences#update` |
| PUT | `/api/v1/accounts/:account_id/captain/preferences(.:format)` | `api/v1/accounts/captain/preferences#update` |
| POST | `/api/v1/accounts/:account_id/captain/assistants/:id/playground(.:format)` | `api/v1/accounts/captain/assistants#playground` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:id/metrics(.:format)` | `api/v1/accounts/captain/assistants#metrics` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:id/faq_stats(.:format)` | `api/v1/accounts/captain/assistants#faq_stats` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:id/summary(.:format)` | `api/v1/accounts/captain/assistants#summary` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:id/drilldown(.:format)` | `api/v1/accounts/captain/assistants#drilldown` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/stats/drilldown(.:format)` | `api/v1/accounts/captain/assistant_stats#drilldown` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/stats/overview(.:format)` | `api/v1/accounts/captain/assistant_stats#overview` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/stats/overview_summary(.:format)` | `api/v1/accounts/captain/assistant_stats#overview_summary` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/stats/resolution_flow(.:format)` | `api/v1/accounts/captain/assistant_stats#resolution_flow` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/stats/resolution_trend(.:format)` | `api/v1/accounts/captain/assistant_stats#resolution_trend` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/tools(.:format)` | `api/v1/accounts/captain/assistants#tools` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/inboxes(.:format)` | `api/v1/accounts/captain/inboxes#index` |
| POST | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/inboxes(.:format)` | `api/v1/accounts/captain/inboxes#create` |
| DELETE | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/inboxes/:inbox_id(.:format)` | `api/v1/accounts/captain/inboxes#destroy` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/scenarios(.:format)` | `api/v1/accounts/captain/scenarios#index` |
| POST | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/scenarios(.:format)` | `api/v1/accounts/captain/scenarios#create` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/scenarios/new(.:format)` | `api/v1/accounts/captain/scenarios#new` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/scenarios/:id/edit(.:format)` | `api/v1/accounts/captain/scenarios#edit` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/scenarios/:id(.:format)` | `api/v1/accounts/captain/scenarios#show` |
| PATCH | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/scenarios/:id(.:format)` | `api/v1/accounts/captain/scenarios#update` |
| PUT | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/scenarios/:id(.:format)` | `api/v1/accounts/captain/scenarios#update` |
| DELETE | `/api/v1/accounts/:account_id/captain/assistants/:assistant_id/scenarios/:id(.:format)` | `api/v1/accounts/captain/scenarios#destroy` |
| GET | `/api/v1/accounts/:account_id/captain/assistants(.:format)` | `api/v1/accounts/captain/assistants#index` |
| POST | `/api/v1/accounts/:account_id/captain/assistants(.:format)` | `api/v1/accounts/captain/assistants#create` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/new(.:format)` | `api/v1/accounts/captain/assistants#new` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:id/edit(.:format)` | `api/v1/accounts/captain/assistants#edit` |
| GET | `/api/v1/accounts/:account_id/captain/assistants/:id(.:format)` | `api/v1/accounts/captain/assistants#show` |
| PATCH | `/api/v1/accounts/:account_id/captain/assistants/:id(.:format)` | `api/v1/accounts/captain/assistants#update` |
| PUT | `/api/v1/accounts/:account_id/captain/assistants/:id(.:format)` | `api/v1/accounts/captain/assistants#update` |
| DELETE | `/api/v1/accounts/:account_id/captain/assistants/:id(.:format)` | `api/v1/accounts/captain/assistants#destroy` |
| GET | `/api/v1/accounts/:account_id/captain/agent_sessions/:id(.:format)` | `api/v1/accounts/captain/agent_sessions#show` |
| GET | `/api/v1/accounts/:account_id/captain/assistant_responses/:id/drilldown(.:format)` | `api/v1/accounts/captain/assistant_responses#drilldown` |
| GET | `/api/v1/accounts/:account_id/captain/assistant_responses(.:format)` | `api/v1/accounts/captain/assistant_responses#index` |
| POST | `/api/v1/accounts/:account_id/captain/assistant_responses(.:format)` | `api/v1/accounts/captain/assistant_responses#create` |
| GET | `/api/v1/accounts/:account_id/captain/assistant_responses/new(.:format)` | `api/v1/accounts/captain/assistant_responses#new` |
| GET | `/api/v1/accounts/:account_id/captain/assistant_responses/:id/edit(.:format)` | `api/v1/accounts/captain/assistant_responses#edit` |
| GET | `/api/v1/accounts/:account_id/captain/assistant_responses/:id(.:format)` | `api/v1/accounts/captain/assistant_responses#show` |
| PATCH | `/api/v1/accounts/:account_id/captain/assistant_responses/:id(.:format)` | `api/v1/accounts/captain/assistant_responses#update` |
| PUT | `/api/v1/accounts/:account_id/captain/assistant_responses/:id(.:format)` | `api/v1/accounts/captain/assistant_responses#update` |
| DELETE | `/api/v1/accounts/:account_id/captain/assistant_responses/:id(.:format)` | `api/v1/accounts/captain/assistant_responses#destroy` |
| POST | `/api/v1/accounts/:account_id/captain/faq_suggestions/:id/approve(.:format)` | `api/v1/accounts/captain/faq_suggestions#approve` |
| POST | `/api/v1/accounts/:account_id/captain/faq_suggestions/:id/dismiss(.:format)` | `api/v1/accounts/captain/faq_suggestions#dismiss` |
| GET | `/api/v1/accounts/:account_id/captain/faq_suggestions(.:format)` | `api/v1/accounts/captain/faq_suggestions#index` |
| GET | `/api/v1/accounts/:account_id/captain/faq_suggestions/:id(.:format)` | `api/v1/accounts/captain/faq_suggestions#show` |
| PATCH | `/api/v1/accounts/:account_id/captain/faq_suggestions/:id(.:format)` | `api/v1/accounts/captain/faq_suggestions#update` |
| PUT | `/api/v1/accounts/:account_id/captain/faq_suggestions/:id(.:format)` | `api/v1/accounts/captain/faq_suggestions#update` |
| POST | `/api/v1/accounts/:account_id/captain/message_reports(.:format)` | `api/v1/accounts/captain/message_reports#create` |
| POST | `/api/v1/accounts/:account_id/captain/bulk_actions(.:format)` | `api/v1/accounts/captain/bulk_actions#create` |
| GET | `/api/v1/accounts/:account_id/captain/copilot_threads/:copilot_thread_id/copilot_messages(.:format)` | `api/v1/accounts/captain/copilot_messages#index` |
| POST | `/api/v1/accounts/:account_id/captain/copilot_threads/:copilot_thread_id/copilot_messages(.:format)` | `api/v1/accounts/captain/copilot_messages#create` |
| GET | `/api/v1/accounts/:account_id/captain/copilot_threads(.:format)` | `api/v1/accounts/captain/copilot_threads#index` |
| POST | `/api/v1/accounts/:account_id/captain/copilot_threads(.:format)` | `api/v1/accounts/captain/copilot_threads#create` |
| POST | `/api/v1/accounts/:account_id/captain/copilot_runs/:id/approve(.:format)` | `api/v1/accounts/captain/copilot_runs#approve` |
| POST | `/api/v1/accounts/:account_id/captain/copilot_runs/:id/reject(.:format)` | `api/v1/accounts/captain/copilot_runs#reject` |
| POST | `/api/v1/accounts/:account_id/captain/custom_tools/test(.:format)` | `api/v1/accounts/captain/custom_tools#test` |
| GET | `/api/v1/accounts/:account_id/captain/custom_tools(.:format)` | `api/v1/accounts/captain/custom_tools#index` |
| POST | `/api/v1/accounts/:account_id/captain/custom_tools(.:format)` | `api/v1/accounts/captain/custom_tools#create` |
| GET | `/api/v1/accounts/:account_id/captain/custom_tools/new(.:format)` | `api/v1/accounts/captain/custom_tools#new` |
| GET | `/api/v1/accounts/:account_id/captain/custom_tools/:id/edit(.:format)` | `api/v1/accounts/captain/custom_tools#edit` |
| GET | `/api/v1/accounts/:account_id/captain/custom_tools/:id(.:format)` | `api/v1/accounts/captain/custom_tools#show` |
| PATCH | `/api/v1/accounts/:account_id/captain/custom_tools/:id(.:format)` | `api/v1/accounts/captain/custom_tools#update` |
| PUT | `/api/v1/accounts/:account_id/captain/custom_tools/:id(.:format)` | `api/v1/accounts/captain/custom_tools#update` |
| DELETE | `/api/v1/accounts/:account_id/captain/custom_tools/:id(.:format)` | `api/v1/accounts/captain/custom_tools#destroy` |
| GET | `/api/v1/accounts/:account_id/captain/tools_manifest/installed(.:format)` | `api/v1/accounts/captain/tools_manifests#installed` |
| POST | `/api/v1/accounts/:account_id/captain/tools_manifest/preview(.:format)` | `api/v1/accounts/captain/tools_manifests#preview` |
| POST | `/api/v1/accounts/:account_id/captain/tools_manifest/install(.:format)` | `api/v1/accounts/captain/tools_manifests#install` |
| POST | `/api/v1/accounts/:account_id/captain/documents/:id/sync(.:format)` | `api/v1/accounts/captain/documents#sync` |
| GET | `/api/v1/accounts/:account_id/captain/documents/:id/drilldown(.:format)` | `api/v1/accounts/captain/documents#drilldown` |
| GET | `/api/v1/accounts/:account_id/captain/documents(.:format)` | `api/v1/accounts/captain/documents#index` |
| POST | `/api/v1/accounts/:account_id/captain/documents(.:format)` | `api/v1/accounts/captain/documents#create` |
| GET | `/api/v1/accounts/:account_id/captain/documents/:id(.:format)` | `api/v1/accounts/captain/documents#show` |
| DELETE | `/api/v1/accounts/:account_id/captain/documents/:id(.:format)` | `api/v1/accounts/captain/documents#destroy` |
| POST | `/api/v1/accounts/:account_id/captain/tasks/rewrite(.:format)` | `api/v1/accounts/captain/tasks#rewrite` |
| POST | `/api/v1/accounts/:account_id/captain/tasks/summarize(.:format)` | `api/v1/accounts/captain/tasks#summarize` |
| POST | `/api/v1/accounts/:account_id/captain/tasks/reply_suggestion(.:format)` | `api/v1/accounts/captain/tasks#reply_suggestion` |
| POST | `/api/v1/accounts/:account_id/captain/tasks/follow_up(.:format)` | `api/v1/accounts/captain/tasks#follow_up` |
| GET | `/api/v1/accounts/:account_id/conversations/:id/inbox_assistant(.:format)` | `api/v1/accounts/conversations#inbox_assistant` |
| POST | `/enterprise/webhooks/firecrawl(.:format)` | `enterprise/webhooks/firecrawl#process_payload` |

## Database tables (17)

`agent_sessions`, `article_embeddings`, `captain_assistant_responses`, `captain_assistants`, `captain_custom_tools`, `captain_documents`, `captain_faq_observations`, `captain_faq_suggestions`, `captain_inboxes`, `captain_message_reports`, `captain_scenarios`, `copilot_action_items`, `copilot_messages`, `copilot_review_findings`, `copilot_runs`, `copilot_threads`, `copilot_tool_calls`

## Backend files (357)

### builders (9)

- `enterprise/app/builders/captain/assistant_drilldown_builder.rb` (EE)
- `enterprise/app/builders/captain/assistant_outcome_classification.rb` (EE)
- `enterprise/app/builders/captain/assistant_overview_drilldown_builder.rb` (EE)
- `enterprise/app/builders/captain/assistant_overview_stats_builder.rb` (EE)
- `enterprise/app/builders/captain/assistant_resolution_flow_builder.rb` (EE)
- `enterprise/app/builders/captain/assistant_resolution_trend_stats_builder.rb` (EE)
- `enterprise/app/builders/captain/assistant_stats_builder.rb` (EE)
- `enterprise/app/builders/captain/assistant_stats_window.rb` (EE)
- `enterprise/app/builders/captain/conversation_usage_builder.rb` (EE)

### controllers (18)

- `app/controllers/api/v1/accounts/captain/preferences_controller.rb`
- `app/controllers/api/v1/accounts/captain/tasks_controller.rb`
- `enterprise/app/controllers/api/v1/accounts/captain/agent_sessions_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/assistant_responses_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/assistant_stats_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/assistants_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/bulk_actions_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/copilot_messages_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/copilot_runs_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/copilot_threads_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/custom_tools_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/documents_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/faq_suggestions_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/inboxes_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/message_reports_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/scenarios_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/captain/tools_manifests_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/webhooks/firecrawl_controller.rb` (EE)

### fields (1)

- `enterprise/app/fields/captain_model_overrides_field.rb` (EE)

### finders (1)

- `enterprise/app/finders/captain/faq_suggestion_finder.rb` (EE)

### helpers (4)

- `enterprise/app/helpers/captain/chat_generation_recorder.rb` (EE)
- `enterprise/app/helpers/captain/chat_helper.rb` (EE)
- `enterprise/app/helpers/captain/chat_response_helper.rb` (EE)
- `enterprise/app/helpers/captain/firecrawl_helper.rb` (EE)

### jobs (27)

- `app/jobs/migration/replace_retired_captain_models_job.rb`
- `app/jobs/migration/validate_openai_hooks_job.rb`
- `enterprise/app/jobs/captain/articles/translate_job.rb` (EE)
- `enterprise/app/jobs/captain/conversation/contact_message_translation_job.rb` (EE)
- `enterprise/app/jobs/captain/conversation/message_builder.rb` (EE)
- `enterprise/app/jobs/captain/conversation/response_builder_job.rb` (EE)
- `enterprise/app/jobs/captain/conversation/v2_lifecycle_events.rb` (EE)
- `enterprise/app/jobs/captain/copilot/action_job.rb` (EE)
- `enterprise/app/jobs/captain/copilot/approval_expiry_job.rb` (EE)
- `enterprise/app/jobs/captain/copilot/background_run_job.rb` (EE)
- `enterprise/app/jobs/captain/copilot/leased_job.rb` (EE)
- `enterprise/app/jobs/captain/copilot/recover_runs_job.rb` (EE)
- `enterprise/app/jobs/captain/copilot/reply_suggestion_job.rb` (EE)
- `enterprise/app/jobs/captain/copilot/response_job.rb` (EE)
- `enterprise/app/jobs/captain/copilot/review_job.rb` (EE)
- `enterprise/app/jobs/captain/copilot/turn_job.rb` (EE)
- `enterprise/app/jobs/captain/documents/crawl_job.rb` (EE)
- `enterprise/app/jobs/captain/documents/perform_sync_job.rb` (EE)
- `enterprise/app/jobs/captain/documents/response_builder_job.rb` (EE)
- `enterprise/app/jobs/captain/documents/schedule_syncs_job.rb` (EE)
- `enterprise/app/jobs/captain/inbox_pending_conversations_resolution_job.rb` (EE)
- `enterprise/app/jobs/captain/llm/conversation_faq_job.rb` (EE)
- `enterprise/app/jobs/captain/llm/update_embedding_job.rb` (EE)
- `enterprise/app/jobs/captain/playground/response_job.rb` (EE)
- `enterprise/app/jobs/captain/tools/firecrawl_parser_job.rb` (EE)
- `enterprise/app/jobs/captain/tools/simple_page_crawl_parser_job.rb` (EE)
- `enterprise/app/jobs/migration/copy_captain_auto_resolve_mode_to_assistants_job.rb` (EE)

### lib (83)

- `lib/captain/base_task_service.rb`
- `lib/captain/csat_utility_analysis_service.rb`
- `lib/captain/follow_up_service.rb`
- `lib/captain/overview_summary_service.rb`
- `lib/captain/reply_suggestion_service.rb`
- `lib/captain/responses_config.rb`
- `lib/captain/rewrite_service.rb`
- `lib/captain/summary_service.rb`
- `lib/captain/tool_instrumentation.rb`
- `lib/captain_response_dequeued_logger.rb`
- `lib/integrations/captain/processor_service.rb`
- `lib/integrations/llm_base_service.rb`
- `lib/integrations/llm_instrumentation.rb`
- `lib/integrations/llm_instrumentation_completion_helpers.rb`
- `lib/integrations/llm_instrumentation_constants.rb`
- `lib/integrations/llm_instrumentation_context.rb`
- `lib/integrations/llm_instrumentation_helpers.rb`
- `lib/integrations/llm_instrumentation_spans.rb`
- `lib/integrations/openai/key_validator.rb`
- `lib/integrations/openai/openai_prompts/captain_overview_summary.liquid`
- `lib/integrations/openai/openai_prompts/csat_utility_analysis.liquid`
- `lib/integrations/openai/openai_prompts/fix_spelling_grammar.liquid`
- `lib/integrations/openai/openai_prompts/improve.liquid`
- `lib/integrations/openai/openai_prompts/reply.liquid`
- `lib/integrations/openai/openai_prompts/summary.liquid`
- `lib/integrations/openai/openai_prompts/tone_rewrite.liquid`
- `lib/llm/config.rb`
- `lib/llm/exception_trackable.rb`
- `lib/llm/feature_router.rb`
- `lib/llm/models.rb`
- `lib/llm_constants.rb`
- `lib/seeders/reports/assistant_conversation_creator.rb`
- `lib/tasks/captain_assistant_migration.rake`
- `lib/tasks/captain_chat.rake`
- `lib/tasks/llm_models.rake`
- `enterprise/lib/captain/assistant_action_schema.rb` (EE)
- `enterprise/lib/captain/assistant_false_promise_schema.rb` (EE)
- `enterprise/lib/captain/conversation_completion_schema.rb` (EE)
- `enterprise/lib/captain/conversation_completion_service.rb` (EE)
- `enterprise/lib/captain/copilot/background_run_pending.rb` (EE)
- `enterprise/lib/captain/copilot/lease_expired_error.rb` (EE)
- `enterprise/lib/captain/copilot/lease_lost_error.rb` (EE)
- `enterprise/lib/captain/copilot/limit_exceeded_error.rb` (EE)
- `enterprise/lib/captain/copilot/review_response_schema.rb` (EE)
- `enterprise/lib/captain/message_length_limit.rb` (EE)
- `enterprise/lib/captain/prompt_renderer.rb` (EE)
- `enterprise/lib/captain/prompts/assistant.liquid` (EE)
- `enterprise/lib/captain/prompts/assistant_overview_summary.liquid` (EE)
- `enterprise/lib/captain/prompts/conversation_completion.liquid` (EE)
- `enterprise/lib/captain/prompts/copilot_reply_suggestion.liquid` (EE)
- `enterprise/lib/captain/prompts/copilot_review.liquid` (EE)
- `enterprise/lib/captain/prompts/copilot_screening_evidence.liquid` (EE)
- `enterprise/lib/captain/prompts/copilot_workflows.liquid` (EE)
- `enterprise/lib/captain/prompts/instruction_auditor.liquid` (EE)
- `enterprise/lib/captain/prompts/instruction_classifier.liquid` (EE)
- `enterprise/lib/captain/prompts/scenario.liquid` (EE)
- `enterprise/lib/captain/prompts/snippets/campaign.liquid` (EE)
- `enterprise/lib/captain/prompts/snippets/citations.liquid` (EE)
- `enterprise/lib/captain/prompts/snippets/contact.liquid` (EE)
- `enterprise/lib/captain/prompts/snippets/conversation.liquid` (EE)
- `enterprise/lib/captain/prompts/snippets/core_rules.liquid` (EE)
- `enterprise/lib/captain/prompts/snippets/current_time.liquid` (EE)
- `enterprise/lib/captain/prompts/snippets/customer_identity.liquid` (EE)
- `enterprise/lib/captain/response_schema.rb` (EE)
- `enterprise/lib/captain/tools/add_contact_note_tool.rb` (EE)
- `enterprise/lib/captain/tools/add_label_to_conversation_tool.rb` (EE)
- `enterprise/lib/captain/tools/add_private_note_tool.rb` (EE)
- `enterprise/lib/captain/tools/base_public_tool.rb` (EE)
- `enterprise/lib/captain/tools/copilot_http_tool.rb` (EE)
- `enterprise/lib/captain/tools/faq_lookup_tool.rb` (EE)
- `enterprise/lib/captain/tools/handoff_tool.rb` (EE)
- `enterprise/lib/captain/tools/http_tool.rb` (EE)
- `enterprise/lib/captain/tools/public_http_tool.rb` (EE)
- `enterprise/lib/captain/tools/resolve_conversation_tool.rb` (EE)
- `enterprise/lib/captain/tools/send_email_verification_code_tool.rb` (EE)
- `enterprise/lib/captain/tools/update_priority_tool.rb` (EE)
- `enterprise/lib/captain/tools/verify_email_code_tool.rb` (EE)
- `enterprise/lib/custom_exceptions/jev_quota_error.rb` (EE)
- `enterprise/lib/enterprise/captain/automation_condition_service.rb` (EE)
- `enterprise/lib/enterprise/captain/base_task_service.rb` (EE)
- `enterprise/lib/enterprise/captain/conversation_completion_service.rb` (EE)
- `enterprise/lib/enterprise/captain/jev_client.rb` (EE)
- `enterprise/lib/enterprise/captain/reply_suggestion_service.rb` (EE)

### listeners (3)

- `enterprise/app/listeners/captain/conversation_outcome_event_listener.rb` (EE)
- `enterprise/app/listeners/captain/reporting_event_listener.rb` (EE)
- `enterprise/app/listeners/captain_listener.rb` (EE)

### mailers (2)

- `enterprise/app/mailers/administrator_notifications/captain_notification_mailer.rb` (EE)
- `enterprise/app/mailers/captain/email_verification_mailer.rb` (EE)

### models (28)

- `app/models/concerns/account_captain_auto_resolve.rb`
- `app/models/concerns/captain_featurable.rb`
- `app/models/concerns/llm_formattable.rb`
- `enterprise/app/models/article_embedding.rb` (EE)
- `enterprise/app/models/captain/agent_session.rb` (EE)
- `enterprise/app/models/captain/assistant.rb` (EE)
- `enterprise/app/models/captain/assistant_response.rb` (EE)
- `enterprise/app/models/captain/custom_tool.rb` (EE)
- `enterprise/app/models/captain/document.rb` (EE)
- `enterprise/app/models/captain/faq_observation.rb` (EE)
- `enterprise/app/models/captain/faq_suggestion.rb` (EE)
- `enterprise/app/models/captain/message_report.rb` (EE)
- `enterprise/app/models/captain/scenario.rb` (EE)
- `enterprise/app/models/captain_inbox.rb` (EE)
- `enterprise/app/models/concerns/captain_markdown_documentable.rb` (EE)
- `enterprise/app/models/concerns/captain_tools_helpers.rb` (EE)
- `enterprise/app/models/concerns/copilot_run_progress.rb` (EE)
- `enterprise/app/models/concerns/toolable.rb` (EE)
- `enterprise/app/models/copilot_action_item.rb` (EE)
- `enterprise/app/models/copilot_message.rb` (EE)
- `enterprise/app/models/copilot_review_finding.rb` (EE)
- `enterprise/app/models/copilot_run.rb` (EE)
- `enterprise/app/models/copilot_run/action.rb` (EE)
- `enterprise/app/models/copilot_run/collection.rb` (EE)
- `enterprise/app/models/copilot_run/review.rb` (EE)
- `enterprise/app/models/copilot_run/turn.rb` (EE)
- `enterprise/app/models/copilot_thread.rb` (EE)
- `enterprise/app/models/copilot_tool_call.rb` (EE)

### policies (5)

- `app/policies/captain/tasks_policy.rb`
- `enterprise/app/policies/captain/assistant_policy.rb` (EE)
- `enterprise/app/policies/captain/custom_tool_policy.rb` (EE)
- `enterprise/app/policies/captain/faq_suggestion_policy.rb` (EE)
- `enterprise/app/policies/captain/scenario_policy.rb` (EE)

### services (122)

- `app/services/captain/automation_condition_service.rb`
- `app/services/captain/conversation_classifier_service.rb`
- `app/services/captain/conversation_transcript.rb`
- `app/services/captain/customer_context.rb`
- `app/services/captain/jev_client.rb`
- `app/services/llm_formatter/article_llm_formatter.rb`
- `app/services/llm_formatter/contact_llm_formatter.rb`
- `app/services/llm_formatter/conversation_llm_formatter.rb`
- `app/services/llm_formatter/default_llm_formatter.rb`
- `app/services/llm_formatter/llm_text_formatter_service.rb`
- `enterprise/app/services/captain/assistant/agent_run_response.rb` (EE)
- `enterprise/app/services/captain/assistant/agent_runner_service.rb` (EE)
- `enterprise/app/services/captain/assistant/instrumentation_attribute_provider.rb` (EE)
- `enterprise/app/services/captain/assistant/response_parts.rb` (EE)
- `enterprise/app/services/captain/assistant/response_rewriter.rb` (EE)
- `enterprise/app/services/captain/assistant/runner_callbacks_helper.rb` (EE)
- `enterprise/app/services/captain/assistant/runner_instrumentation_helper.rb` (EE)
- `enterprise/app/services/captain/assistant/runner_state_helper.rb` (EE)
- `enterprise/app/services/captain/assistant/session_capture_service.rb` (EE)
- `enterprise/app/services/captain/assistant/trace_payload_helper.rb` (EE)
- `enterprise/app/services/captain/assistant_migration/draft_applier.rb` (EE)
- `enterprise/app/services/captain/assistant_migration/faq_applier.rb` (EE)
- `enterprise/app/services/captain/assistant_migration/instruction_auditor.rb` (EE)
- `enterprise/app/services/captain/assistant_migration/instruction_auditor_schema.rb` (EE)
- `enterprise/app/services/captain/assistant_migration/instruction_classifier.rb` (EE)
- `enterprise/app/services/captain/assistant_migration/instruction_classifier_schema.rb` (EE)
- `enterprise/app/services/captain/assistant_overview_summary_schema.rb` (EE)
- `enterprise/app/services/captain/assistant_overview_summary_service.rb` (EE)
- `enterprise/app/services/captain/audience_matcher.rb` (EE)
- `enterprise/app/services/captain/conversation/agent_message_translation_service.rb` (EE)
- `enterprise/app/services/captain/conversation/contact_message_translation_service.rb` (EE)
- `enterprise/app/services/captain/conversation/message_history_builder_service.rb` (EE)
- `enterprise/app/services/captain/conversation/message_language_service.rb` (EE)
- `enterprise/app/services/captain/conversation/resolution_message_service.rb` (EE)
- `enterprise/app/services/captain/conversation/response_lifecycle_logging.rb` (EE)
- `enterprise/app/services/captain/conversation/response_scheduler_service.rb` (EE)
- `enterprise/app/services/captain/conversation/translator_service.rb` (EE)
- `enterprise/app/services/captain/conversation_events.rb` (EE)
- `enterprise/app/services/captain/conversation_outcome_tracker.rb` (EE)
- `enterprise/app/services/captain/copilot/actions.rb` (EE)
- `enterprise/app/services/captain/copilot/actions/add_labels.rb` (EE)
- `enterprise/app/services/captain/copilot/actions/base_action.rb` (EE)
- `enterprise/app/services/captain/copilot/chat_service.rb` (EE)
- `enterprise/app/services/captain/copilot/collection_service.rb` (EE)
- `enterprise/app/services/captain/copilot/conversation_access.rb` (EE)
- `enterprise/app/services/captain/copilot/readable_messages.rb` (EE)
- `enterprise/app/services/captain/copilot/reply_suggestion_service.rb` (EE)
- `enterprise/app/services/captain/copilot/resources.rb` (EE)
- `enterprise/app/services/captain/copilot/resources/base_resource.rb` (EE)
- `enterprise/app/services/captain/copilot/resources/contacts.rb` (EE)
- `enterprise/app/services/captain/copilot/resources/conversations.rb` (EE)
- `enterprise/app/services/captain/copilot/resources/messages.rb` (EE)
- `enterprise/app/services/captain/copilot/result_table.rb` (EE)
- `enterprise/app/services/captain/copilot/review_service.rb` (EE)
- `enterprise/app/services/captain/copilot/screening_service.rb` (EE)
- `enterprise/app/services/captain/copilot/tracing.rb` (EE)
- `enterprise/app/services/captain/copilot/turn_service.rb` (EE)
- `enterprise/app/services/captain/copilot/turn_transcript.rb` (EE)
- `enterprise/app/services/captain/documents/single_page_fetcher.rb` (EE)
- `enterprise/app/services/captain/documents/sync_service.rb` (EE)
- `enterprise/app/services/captain/email_verification.rb` (EE)
- `enterprise/app/services/captain/email_verification/code.rb` (EE)
- `enterprise/app/services/captain/faq_suggestion_approval_service.rb` (EE)
- `enterprise/app/services/captain/llm/article_translation_service.rb` (EE)
- `enterprise/app/services/captain/llm/article_writer_schema.rb` (EE)
- `enterprise/app/services/captain/llm/article_writer_service.rb` (EE)
- `enterprise/app/services/captain/llm/contact_attributes_service.rb` (EE)
- `enterprise/app/services/captain/llm/contact_notes_service.rb` (EE)
- `enterprise/app/services/captain/llm/conversation_faq_content_service.rb` (EE)
- `enterprise/app/services/captain/llm/conversation_faq_prompts_service.rb` (EE)
- `enterprise/app/services/captain/llm/conversation_faq_service.rb` (EE)
- `enterprise/app/services/captain/llm/embedding_service.rb` (EE)
- `enterprise/app/services/captain/llm/faq_generator_service.rb` (EE)
- `enterprise/app/services/captain/llm/help_center_curation_schema.rb` (EE)
- `enterprise/app/services/captain/llm/help_center_curation_service.rb` (EE)
- `enterprise/app/services/captain/llm/language_detection_schema.rb` (EE)
- `enterprise/app/services/captain/llm/language_detection_service.rb` (EE)
- `enterprise/app/services/captain/llm/message_translation_schema.rb` (EE)
- `enterprise/app/services/captain/llm/message_translation_service.rb` (EE)
- `enterprise/app/services/captain/llm/paginated_faq_generator_service.rb` (EE)
- `enterprise/app/services/captain/llm/pdf_processing_service.rb` (EE)
- `enterprise/app/services/captain/llm/system_prompts_service.rb` (EE)
- `enterprise/app/services/captain/llm/translate_query_service.rb` (EE)
- `enterprise/app/services/captain/llm/widget_tagline_schema.rb` (EE)
- `enterprise/app/services/captain/llm/widget_tagline_service.rb` (EE)
- `enterprise/app/services/captain/onboarding/website_analyzer_service.rb` (EE)
- `enterprise/app/services/captain/open_ai_message_builder_service.rb` (EE)
- `enterprise/app/services/captain/outcome_tracking_history.rb` (EE)
- `enterprise/app/services/captain/playground/configuration.rb` (EE)
- `enterprise/app/services/captain/playground/run_details.rb` (EE)
- `enterprise/app/services/captain/playground/runner.rb` (EE)
- `enterprise/app/services/captain/tool_registry_service.rb` (EE)
- `enterprise/app/services/captain/tools/base_service.rb` (EE)
- `enterprise/app/services/captain/tools/base_tool.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/act_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/continue_review_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/display_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/get_article_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/get_contact_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/get_conversation_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/get_data_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/review_conversations_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/search_articles_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/search_contacts_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/search_conversations_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/search_linear_issues_service.rb` (EE)
- `enterprise/app/services/captain/tools/copilot/workflow_tool.rb` (EE)
- `enterprise/app/services/captain/tools/firecrawl_service.rb` (EE)
- `enterprise/app/services/captain/tools/html_page_parser.rb` (EE)
- `enterprise/app/services/captain/tools/instrumentation.rb` (EE)
- `enterprise/app/services/captain/tools/search_documentation_service.rb` (EE)
- `enterprise/app/services/captain/tools/search_reply_documentation_service.rb` (EE)
- `enterprise/app/services/captain/tools/simple_page_crawl_service.rb` (EE)
- `enterprise/app/services/captain/tools_manifest/github_source.rb` (EE)
- `enterprise/app/services/captain/tools_manifest/install_service.rb` (EE)
- `enterprise/app/services/captain/tools_manifest/manifest.rb` (EE)
- `enterprise/app/services/firecrawl/configuration.rb` (EE)
- `enterprise/app/services/llm/base_ai_service.rb` (EE)
- `enterprise/app/services/llm/legacy_base_open_ai_service.rb` (EE)
- `enterprise/app/services/llm/speech_to_text_service.rb` (EE)
- `enterprise/app/services/llm/text_to_speech_service.rb` (EE)
- `enterprise/app/services/page_crawler_service.rb` (EE)

### validators (1)

- `enterprise/app/validators/captain/audience_validator.rb` (EE)

### views (53)

- `app/views/mailers/administrator_notifications/integrations_notification_mailer/openai_disconnect.liquid`
- `enterprise/app/views/administrator_notifications/captain_notification_mailer/response_usage_alert.html.erb` (EE)
- `enterprise/app/views/api/v1/accounts/captain/agent_sessions/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/assistant_responses/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/assistant_responses/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/assistant_responses/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/assistant_responses/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/assistants/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/assistants/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/assistants/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/assistants/tools.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/assistants/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/bulk_actions/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/copilot_messages/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/copilot_messages/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/copilot_threads/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/copilot_threads/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/custom_tools/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/custom_tools/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/custom_tools/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/custom_tools/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/documents/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/documents/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/documents/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/faq_suggestions/approve.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/faq_suggestions/dismiss.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/faq_suggestions/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/faq_suggestions/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/faq_suggestions/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/inboxes/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/inboxes/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/message_reports/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/scenarios/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/scenarios/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/scenarios/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/scenarios/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/tools_manifests/install.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/tools_manifests/installed.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/captain/tools_manifests/preview.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_assistant.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_assistant_response.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_assistant_slim.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_copilot_message.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_copilot_thread.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_custom_tool.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_document.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_faq_observation.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_faq_suggestion.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/captain/_scenario.json.jbuilder` (EE)
- `enterprise/app/views/captain/email_verification_mailer/verification_code.liquid` (EE)
- `enterprise/app/views/enterprise/api/v1/accounts/assignable_agents/_assistants.json.jbuilder` (EE)
- `enterprise/app/views/fields/captain_model_overrides_field/_form.html.erb` (EE)
- `enterprise/app/views/fields/captain_model_overrides_field/_show.html.erb` (EE)

## Ruby specs (133)

- `spec/controllers/api/v1/accounts/captain/preferences_controller_spec.rb`
- `spec/enterprise/builders/captain/assistant_overview_stats_builder_spec.rb`
- `spec/enterprise/builders/captain/assistant_resolution_flow_builder_spec.rb`
- `spec/enterprise/builders/captain/assistant_resolution_trend_stats_builder_spec.rb`
- `spec/enterprise/builders/captain/assistant_stats_builder_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/agent_sessions_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/assistant_responses_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/assistants_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/bulk_actions_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/copilot_messages_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/copilot_threads_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/custom_tools_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/documents_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/faq_suggestions_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/inboxes_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/message_reports_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/scenarios_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/captain/tools_manifests_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/webooks/firecrawl_controller_spec.rb`
- `spec/enterprise/helpers/captain/chat_generation_recorder_spec.rb`
- `spec/enterprise/jobs/captain/articles/translate_job_spec.rb`
- `spec/enterprise/jobs/captain/conversation/response_builder_job_spec.rb`
- `spec/enterprise/jobs/captain/copilot/reply_suggestion_job_spec.rb`
- `spec/enterprise/jobs/captain/copilot/response_job_spec.rb`
- `spec/enterprise/jobs/captain/documents/crawl_job_spec.rb`
- `spec/enterprise/jobs/captain/documents/perform_sync_job_spec.rb`
- `spec/enterprise/jobs/captain/documents/response_builder_job_spec.rb`
- `spec/enterprise/jobs/captain/documents/schedule_syncs_job_spec.rb`
- `spec/enterprise/jobs/captain/inbox_pending_conversations_resolution_job_spec.rb`
- `spec/enterprise/jobs/captain/llm/conversation_faq_job_spec.rb`
- `spec/enterprise/jobs/captain/playground/response_job_spec.rb`
- `spec/enterprise/jobs/captain/tools/firecrawl_parser_job_spec.rb`
- `spec/enterprise/jobs/captain/tools/simple_page_crawl_parser_job_spec.rb`
- `spec/enterprise/jobs/migration/copy_captain_auto_resolve_mode_to_assistants_job_spec.rb`
- `spec/enterprise/lib/captain/base_task_service_spec.rb`
- `spec/enterprise/lib/captain/conversation_completion_service_spec.rb`
- `spec/enterprise/lib/captain/prompt_renderer_spec.rb`
- `spec/enterprise/lib/captain/reply_suggestion_service_spec.rb`
- `spec/enterprise/lib/captain/responses_config_spec.rb`
- `spec/enterprise/lib/captain/tools/add_contact_note_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/add_label_to_conversation_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/add_private_note_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/copilot_http_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/faq_lookup_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/handoff_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/http_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/public_http_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/resolve_conversation_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/send_email_verification_code_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/update_priority_tool_spec.rb`
- `spec/enterprise/lib/captain/tools/verify_email_code_tool_spec.rb`
- `spec/enterprise/listeners/captain/reporting_event_listener_spec.rb`
- `spec/enterprise/listeners/captain_listener_spec.rb`
- `spec/enterprise/mailers/administrator_notifications/captain_notification_mailer_spec.rb`
- `spec/enterprise/mailers/captain/email_verification_mailer_spec.rb`
- `spec/enterprise/models/captain/agent_session_spec.rb`
- `spec/enterprise/models/captain/assistant_response_spec.rb`
- `spec/enterprise/models/captain/assistant_spec.rb`
- `spec/enterprise/models/captain/custom_tool_spec.rb`
- `spec/enterprise/models/captain/document_spec.rb`
- `spec/enterprise/models/captain/message_report_spec.rb`
- `spec/enterprise/models/captain/scenario_spec.rb`
- `spec/enterprise/models/concerns/captain_tools_helpers_spec.rb`
- `spec/enterprise/models/copilot_message_spec.rb`
- `spec/enterprise/models/copilot_run_spec.rb`
- `spec/enterprise/models/copilot_thread_spec.rb`
- `spec/enterprise/policies/captain/assistant_policy_spec.rb`
- `spec/enterprise/services/captain/assistant/agent_runner_service_spec.rb`
- `spec/enterprise/services/captain/assistant/session_capture_service_spec.rb`
- `spec/enterprise/services/captain/assistant_migration/draft_applier_spec.rb`
- `spec/enterprise/services/captain/assistant_migration/instruction_classifier_spec.rb`
- `spec/enterprise/services/captain/audience_matcher_spec.rb`
- `spec/enterprise/services/captain/conversation/agent_message_translation_service_spec.rb`
- `spec/enterprise/services/captain/conversation/contact_message_translation_service_spec.rb`
- `spec/enterprise/services/captain/conversation/resolution_message_service_spec.rb`
- `spec/enterprise/services/captain/conversation_events_spec.rb`
- `spec/enterprise/services/captain/conversation_outcome_tracker_spec.rb`
- `spec/enterprise/services/captain/copilot/chat_service_spec.rb`
- `spec/enterprise/services/captain/copilot/reply_suggestion_service_spec.rb`
- `spec/enterprise/services/captain/copilot/screening_service_spec.rb`
- `spec/enterprise/services/captain/email_verification_spec.rb`
- `spec/enterprise/services/captain/llm/article_translation_service_spec.rb`
- `spec/enterprise/services/captain/llm/conversation_faq_prompts_service_spec.rb`
- `spec/enterprise/services/captain/llm/conversation_faq_service_spec.rb`
- `spec/enterprise/services/captain/llm/embedding_service_spec.rb`
- `spec/enterprise/services/captain/llm/faq_generator_service_spec.rb`
- `spec/enterprise/services/captain/llm/language_detection_service_spec.rb`
- `spec/enterprise/services/captain/llm/message_translation_service_spec.rb`
- `spec/enterprise/services/captain/llm/paginated_faq_generator_service_spec.rb`
- `spec/enterprise/services/captain/llm/pdf_processing_service_spec.rb`
- `spec/enterprise/services/captain/onboarding/website_analyzer_service_spec.rb`
- `spec/enterprise/services/captain/open_ai_message_builder_service_spec.rb`
- `spec/enterprise/services/captain/playground/configuration_spec.rb`
- `spec/enterprise/services/captain/playground/run_details_spec.rb`
- `spec/enterprise/services/captain/tool_registry_service_spec.rb`
- `spec/enterprise/services/captain/tools/copilot/get_article_service_spec.rb`
- `spec/enterprise/services/captain/tools/copilot/get_contact_service_spec.rb`
- `spec/enterprise/services/captain/tools/copilot/get_conversation_service_spec.rb`
- `spec/enterprise/services/captain/tools/copilot/search_articles_service_spec.rb`
- `spec/enterprise/services/captain/tools/copilot/search_contacts_service_spec.rb`
- `spec/enterprise/services/captain/tools/copilot/search_conversations_service_spec.rb`
- `spec/enterprise/services/captain/tools/copilot/search_linear_issues_service_spec.rb`
- `spec/enterprise/services/captain/tools/firecrawl_service_spec.rb`
- `spec/enterprise/services/captain/tools/search_documentation_service_spec.rb`
- `spec/enterprise/services/captain/tools/simple_page_crawl_service_spec.rb`
- `spec/enterprise/services/captain/tools_manifest/github_source_spec.rb`
- `spec/enterprise/services/captain/tools_manifest/install_service_spec.rb`
- `spec/enterprise/services/llm/base_ai_service_spec.rb`
- `spec/enterprise/services/llm/speech_to_text_service_spec.rb`
- `spec/enterprise/services/llm/text_to_speech_service_spec.rb`
- `spec/jobs/migration/validate_openai_hooks_job_spec.rb`
- `spec/lib/captain/base_task_service_spec.rb`
- `spec/lib/captain/csat_utility_analysis_service_spec.rb`
- `spec/lib/captain/follow_up_service_spec.rb`
- `spec/lib/captain/reply_suggestion_service_spec.rb`
- `spec/lib/captain/rewrite_service_spec.rb`
- `spec/lib/captain/summary_service_spec.rb`
- `spec/lib/integrations/llm_base_service_spec.rb`
- `spec/lib/integrations/llm_instrumentation_spec.rb`
- `spec/lib/integrations/openai/key_validator_spec.rb`
- `spec/lib/llm/config_spec.rb`
- `spec/lib/llm/feature_router_spec.rb`
- `spec/lib/llm/models_spec.rb`
- `spec/models/concerns/captain_featurable_spec.rb`
- `spec/requests/captain_toolset_install_link_spec.rb`
- `spec/services/captain/automation_condition_service_spec.rb`
- `spec/services/captain/conversation_classifier_service_spec.rb`
- `spec/services/captain/conversation_transcript_spec.rb`
- `spec/services/captain/customer_context_spec.rb`
- `spec/services/captain/jev_client_spec.rb`
- `spec/services/llm_formatter/article_llm_formatter_spec.rb`
- `spec/services/llm_formatter/contact_llm_formatter_spec.rb`
- `spec/services/llm_formatter/conversation_llm_formatter_spec.rb`

## Frontend files (224)

- `app/javascript/dashboard/api/captain/agentSessions.js`
- `app/javascript/dashboard/api/captain/assistant.js`
- `app/javascript/dashboard/api/captain/assistantStats.js`
- `app/javascript/dashboard/api/captain/bulkActions.js`
- `app/javascript/dashboard/api/captain/copilotMessages.js`
- `app/javascript/dashboard/api/captain/copilotRuns.js`
- `app/javascript/dashboard/api/captain/copilotThreads.js`
- `app/javascript/dashboard/api/captain/customTools.js`
- `app/javascript/dashboard/api/captain/document.js`
- `app/javascript/dashboard/api/captain/faqSuggestions.js`
- `app/javascript/dashboard/api/captain/inboxes.js`
- `app/javascript/dashboard/api/captain/messageReports.js`
- `app/javascript/dashboard/api/captain/preferences.js`
- `app/javascript/dashboard/api/captain/response.js`
- `app/javascript/dashboard/api/captain/scenarios.js`
- `app/javascript/dashboard/api/captain/tasks.js`
- `app/javascript/dashboard/api/captain/tools.js`
- `app/javascript/dashboard/api/captain/toolsCatalog.js`
- `app/javascript/dashboard/api/captain/toolsManifest.js`
- `app/javascript/dashboard/components-next/captain/AnimatingImg/AnimatingImg.story.vue`
- `app/javascript/dashboard/components-next/captain/AnimatingImg/Guardrails.vue`
- `app/javascript/dashboard/components-next/captain/AnimatingImg/ResponseGuidelines.vue`
- `app/javascript/dashboard/components-next/captain/AnimatingImg/Scenarios.vue`
- `app/javascript/dashboard/components-next/captain/AnimatingImg/Settings.vue`
- `app/javascript/dashboard/components-next/captain/PageLayout.vue`
- `app/javascript/dashboard/components-next/captain/assistant/AddNewRulesDialog.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/AddNewRulesDialog.vue`
- `app/javascript/dashboard/components-next/captain/assistant/AddNewRulesInput.spec.js`
- `app/javascript/dashboard/components-next/captain/assistant/AddNewRulesInput.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/AddNewRulesInput.vue`
- `app/javascript/dashboard/components-next/captain/assistant/AddNewScenariosDialog.vue`
- `app/javascript/dashboard/components-next/captain/assistant/AssistantCard.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/AssistantCard.vue`
- `app/javascript/dashboard/components-next/captain/assistant/AssistantPlayground.spec.js`
- `app/javascript/dashboard/components-next/captain/assistant/AssistantPlayground.vue`
- `app/javascript/dashboard/components-next/captain/assistant/BulkSelectBar.vue`
- `app/javascript/dashboard/components-next/captain/assistant/DocumentBulkActions.vue`
- `app/javascript/dashboard/components-next/captain/assistant/DocumentCard.spec.js`
- `app/javascript/dashboard/components-next/captain/assistant/DocumentCard.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/DocumentCard.vue`
- `app/javascript/dashboard/components-next/captain/assistant/DocumentFilter.vue`
- `app/javascript/dashboard/components-next/captain/assistant/DocumentFiltersBar.spec.js`
- `app/javascript/dashboard/components-next/captain/assistant/DocumentFiltersBar.vue`
- `app/javascript/dashboard/components-next/captain/assistant/DocumentSyncStatus.vue`
- `app/javascript/dashboard/components-next/captain/assistant/FaqSuggestionCard.vue`
- `app/javascript/dashboard/components-next/captain/assistant/InboxCard.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/InboxCard.vue`
- `app/javascript/dashboard/components-next/captain/assistant/MessageList.vue`
- `app/javascript/dashboard/components-next/captain/assistant/PlaygroundRunDetails.spec.js`
- `app/javascript/dashboard/components-next/captain/assistant/PlaygroundRunDetails.vue`
- `app/javascript/dashboard/components-next/captain/assistant/PlaygroundTestSetup.spec.js`
- `app/javascript/dashboard/components-next/captain/assistant/PlaygroundTestSetup.vue`
- `app/javascript/dashboard/components-next/captain/assistant/ResponseCard.spec.js`
- `app/javascript/dashboard/components-next/captain/assistant/ResponseCard.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/ResponseCard.vue`
- `app/javascript/dashboard/components-next/captain/assistant/RuleCard.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/RuleCard.vue`
- `app/javascript/dashboard/components-next/captain/assistant/ScenariosCard.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/ScenariosCard.vue`
- `app/javascript/dashboard/components-next/captain/assistant/SuggestedRules.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/SuggestedRules.vue`
- `app/javascript/dashboard/components-next/captain/assistant/ToolsDropdown.story.vue`
- `app/javascript/dashboard/components-next/captain/assistant/ToolsDropdown.vue`
- `app/javascript/dashboard/components-next/captain/assistant/usePlaygroundSession.js`
- `app/javascript/dashboard/components-next/captain/assistant/usePlaygroundSession.spec.js`
- `app/javascript/dashboard/components-next/captain/classifier/SuggestButton.vue`
- `app/javascript/dashboard/components-next/captain/classifier/SuggestionChip.vue`
- `app/javascript/dashboard/components-next/captain/classifier/SuggestionSkeleton.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/BulkDeleteDialog.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/ConversationUsageDrawer.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/ConversationUsageDrawer.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/DeleteDialog.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/Paywall.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/AssistantForm.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/CreateAssistantDialog.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/AssistantAudienceForm.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/AssistantAudienceForm.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/AssistantBasicSettingsForm.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/AssistantControlItems.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/AssistantScheduleForm.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/AssistantSystemSettingsForm.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/AssistantSystemSettingsForm.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/DurationSelect.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/DurationSelect.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/SettingsPageLayout.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/audience/AudienceGroup.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/audience/useAudienceFilterTypes.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/assistant/settings/audience/useAudienceFilterTypes.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/AssistantToolsBanner.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/AuthConfig.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/CreateCustomToolDialog.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/CustomToolCard.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/CustomToolCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/CustomToolDetails.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/CustomToolForm.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/HeadersConfig.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/HeadersConfig.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/InstallManifestDialog.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/InstallManifestDialog.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/ParamRow.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/ToolFormSection.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/ToolFormSection.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/ToolsetCatalogCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/ToolsetDetailsPanel.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/ToolsetIdentity.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/ToolsetInstallBadge.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/ToolsetInstallFlow.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/VerifiedParamRow.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/toolRisk.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/customTool/toolRisk.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/document/CreateDocumentDialog.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/document/DocumentDetails.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/document/DocumentDetails.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/document/DocumentForm.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/document/LimitBanner.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/emptyStates/AssistantPageEmptyState.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/emptyStates/CustomToolsPageEmptyState.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/emptyStates/DocumentPageEmptyState.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/emptyStates/InboxPageEmptyState.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/emptyStates/ResponsePageEmptyState.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/emptyStates/captainEmptyStateContent.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/inbox/ConnectInboxDialog.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/inbox/ConnectInboxForm.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/AssistantDrilldownDrawer.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/CoverageBanner.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/InboxBanner.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/KnowledgeCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/MetricCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/MetricHint.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/QuickLinks.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/RangeSelector.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/WelcomeCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/CsatCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/KnowledgeCoverageCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/OverviewDrilldownDrawer.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/OverviewPanel.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/OverviewSummaryCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/OverviewV2.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/ProgressMetric.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/ResolutionFlowCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/ResolutionTrendCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/UsageCard.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/overview/v2/drilldownMetrics.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/response/CreateResponseDialog.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/response/FaqSuggestionReviewDialog.spec.js`
- `app/javascript/dashboard/components-next/captain/pageComponents/response/FaqSuggestionReviewDialog.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/response/LimitBanner.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/response/ResponseForm.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/settings/SettingsHeader.story.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/settings/SettingsHeader.vue`
- `app/javascript/dashboard/components-next/captain/pageComponents/switcher/AssistantSwitcher.vue`
- `app/javascript/dashboard/components-next/copilot/Copilot.story.vue`
- `app/javascript/dashboard/components-next/copilot/Copilot.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotAgentMessage.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotApprovalMessage.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotAssistantMessage.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotEmptyState.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotInput.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotLauncher.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotLoader.story.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotLoader.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotThinkingBlock.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotThinkingGroup.story.vue`
- `app/javascript/dashboard/components-next/copilot/CopilotThinkingGroup.vue`
- `app/javascript/dashboard/components-next/copilot/ToggleCopilotAssistant.vue`
- `app/javascript/dashboard/components-next/copilot/specs/Copilot.spec.js`
- `app/javascript/dashboard/components-next/copilot/specs/CopilotAssistantMessage.spec.js`
- `app/javascript/dashboard/components-next/copilot/specs/CopilotEmptyState.spec.js`
- `app/javascript/dashboard/components-next/copilot/specs/CopilotInput.spec.js`
- `app/javascript/dashboard/components-next/message/CaptainGenerationDetails.vue`
- `app/javascript/dashboard/components/copilot/CopilotContainer.spec.js`
- `app/javascript/dashboard/components/copilot/CopilotContainer.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/CopilotEditor.spec.js`
- `app/javascript/dashboard/components/widgets/WootWriter/CopilotEditor.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/CopilotMenuBar.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/CopilotReplyBottomPanel.vue`
- `app/javascript/dashboard/components/widgets/conversation/CopilotEditorSection.vue`
- `app/javascript/dashboard/components/widgets/conversation/copilot/CaptainLoader.vue`
- `app/javascript/dashboard/composables/captain/constants.js`
- `app/javascript/dashboard/composables/spec/useCaptain.spec.js`
- `app/javascript/dashboard/composables/useCaptain.js`
- `app/javascript/dashboard/composables/useCopilotReply.js`
- `app/javascript/dashboard/modules/conversations/components/ReportCaptainMessageDialog.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/guardrails/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/guidelines/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/inboxes/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/playground/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/scenarios/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/settings/Audience.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/settings/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/settings/Schedule.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/settings/System.vue`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/settings/useAssistantSettings.js`
- `app/javascript/dashboard/routes/dashboard/captain/assistants/settings/useAssistantSettings.spec.js`
- `app/javascript/dashboard/routes/dashboard/captain/captain.routes.js`
- `app/javascript/dashboard/routes/dashboard/captain/documents/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/pages/AssistantsIndexPage.vue`
- `app/javascript/dashboard/routes/dashboard/captain/pages/CaptainPageRouteView.vue`
- `app/javascript/dashboard/routes/dashboard/captain/responses/FaqSuggestions.spec.js`
- `app/javascript/dashboard/routes/dashboard/captain/responses/FaqSuggestions.vue`
- `app/javascript/dashboard/routes/dashboard/captain/responses/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/tools/Explore.vue`
- `app/javascript/dashboard/routes/dashboard/captain/tools/Index.spec.js`
- `app/javascript/dashboard/routes/dashboard/captain/tools/Index.vue`
- `app/javascript/dashboard/routes/dashboard/captain/tools/Install.vue`
- `app/javascript/dashboard/routes/dashboard/settings/captain/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/captain/captain.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/captain/components/FeatureToggle.vue`
- `app/javascript/dashboard/routes/dashboard/settings/captain/components/ModelDropdown.vue`
- `app/javascript/dashboard/routes/dashboard/settings/captain/components/ModelSelector.vue`
- `app/javascript/dashboard/store/captain/agentSessions.js`
- `app/javascript/dashboard/store/captain/assistant.js`
- `app/javascript/dashboard/store/captain/bulkActions.js`
- `app/javascript/dashboard/store/captain/copilotMessages.js`
- `app/javascript/dashboard/store/captain/copilotThreads.js`
- `app/javascript/dashboard/store/captain/customTools.js`
- `app/javascript/dashboard/store/captain/document.js`
- `app/javascript/dashboard/store/captain/faqSuggestions.js`
- `app/javascript/dashboard/store/captain/inboxes.js`
- `app/javascript/dashboard/store/captain/preferences.js`
- `app/javascript/dashboard/store/captain/response.js`
- `app/javascript/dashboard/store/captain/scenarios.js`
- `app/javascript/dashboard/store/captain/tools.js`
