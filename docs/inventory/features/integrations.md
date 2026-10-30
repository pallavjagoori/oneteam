# Integrations

**Area:** Integrations

Third-party apps: Slack, Linear, Notion, Shopify, Stripe app, Dyte video calls, Dialogflow, Google Translate, LeadSquared, dashboard apps and integration hooks.

**Feature flags:** `integrations`, `linear_integration`, `shopify_integration`, `notion_integration`, `stripe_integration`

## HTTP routes (50)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/slack_uploads(.:format)` | `slack_uploads#show` |
| GET | `/api/v1/accounts/:account_id/dashboard_apps(.:format)` | `api/v1/accounts/dashboard_apps#index` |
| POST | `/api/v1/accounts/:account_id/dashboard_apps(.:format)` | `api/v1/accounts/dashboard_apps#create` |
| GET | `/api/v1/accounts/:account_id/dashboard_apps/:id(.:format)` | `api/v1/accounts/dashboard_apps#show` |
| PATCH | `/api/v1/accounts/:account_id/dashboard_apps/:id(.:format)` | `api/v1/accounts/dashboard_apps#update` |
| PUT | `/api/v1/accounts/:account_id/dashboard_apps/:id(.:format)` | `api/v1/accounts/dashboard_apps#update` |
| DELETE | `/api/v1/accounts/:account_id/dashboard_apps/:id(.:format)` | `api/v1/accounts/dashboard_apps#destroy` |
| POST | `/api/v1/accounts/:account_id/conversations/:conversation_id/messages/auto_translate(.:format)` | `api/v1/accounts/conversations/messages#auto_translate` |
| POST | `/api/v1/accounts/:account_id/conversations/:conversation_id/messages/:id/translate(.:format)` | `api/v1/accounts/conversations/messages#translate` |
| POST | `/api/v1/accounts/:account_id/notion/authorization(.:format)` | `api/v1/accounts/notion/authorizations#create` |
| POST | `/api/v1/accounts/:account_id/integrations/stripe/auth(.:format)` | `api/v1/accounts/integrations/stripe#auth` |
| GET | `/api/v1/accounts/:account_id/integrations/stripe/customer(.:format)` | `api/v1/accounts/integrations/stripe#customer` |
| GET | `/api/v1/accounts/:account_id/integrations/stripe(.:format)` | `api/v1/accounts/integrations/stripe#show` |
| DELETE | `/api/v1/accounts/:account_id/integrations/stripe(.:format)` | `api/v1/accounts/integrations/stripe#destroy` |
| GET | `/api/v1/accounts/:account_id/integrations/apps(.:format)` | `api/v1/accounts/integrations/apps#index` |
| GET | `/api/v1/accounts/:account_id/integrations/apps/:id(.:format)` | `api/v1/accounts/integrations/apps#show` |
| POST | `/api/v1/accounts/:account_id/integrations/hooks/:id/process_event(.:format)` | `api/v1/accounts/integrations/hooks#process_event` |
| POST | `/api/v1/accounts/:account_id/integrations/hooks(.:format)` | `api/v1/accounts/integrations/hooks#create` |
| GET | `/api/v1/accounts/:account_id/integrations/hooks/:id(.:format)` | `api/v1/accounts/integrations/hooks#show` |
| PATCH | `/api/v1/accounts/:account_id/integrations/hooks/:id(.:format)` | `api/v1/accounts/integrations/hooks#update` |
| PUT | `/api/v1/accounts/:account_id/integrations/hooks/:id(.:format)` | `api/v1/accounts/integrations/hooks#update` |
| DELETE | `/api/v1/accounts/:account_id/integrations/hooks/:id(.:format)` | `api/v1/accounts/integrations/hooks#destroy` |
| GET | `/api/v1/accounts/:account_id/integrations/slack/list_all_channels(.:format)` | `api/v1/accounts/integrations/slack#list_all_channels` |
| PATCH | `/api/v1/accounts/:account_id/integrations/slack(.:format)` | `api/v1/accounts/integrations/slack#update` |
| PUT | `/api/v1/accounts/:account_id/integrations/slack(.:format)` | `api/v1/accounts/integrations/slack#update` |
| DELETE | `/api/v1/accounts/:account_id/integrations/slack(.:format)` | `api/v1/accounts/integrations/slack#destroy` |
| POST | `/api/v1/accounts/:account_id/integrations/slack(.:format)` | `api/v1/accounts/integrations/slack#create` |
| POST | `/api/v1/accounts/:account_id/integrations/dyte/create_a_meeting(.:format)` | `api/v1/accounts/integrations/dyte#create_a_meeting` |
| POST | `/api/v1/accounts/:account_id/integrations/dyte/add_participant_to_meeting(.:format)` | `api/v1/accounts/integrations/dyte#add_participant_to_meeting` |
| POST | `/api/v1/accounts/:account_id/integrations/shopify/auth(.:format)` | `api/v1/accounts/integrations/shopify#auth` |
| POST | `/api/v1/accounts/:account_id/integrations/shopify/complete_install(.:format)` | `api/v1/accounts/integrations/shopify#complete_install` |
| GET | `/api/v1/accounts/:account_id/integrations/shopify/orders(.:format)` | `api/v1/accounts/integrations/shopify#orders` |
| DELETE | `/api/v1/accounts/:account_id/integrations/shopify(.:format)` | `api/v1/accounts/integrations/shopify#destroy` |
| DELETE | `/api/v1/accounts/:account_id/integrations/linear(.:format)` | `api/v1/accounts/integrations/linear#destroy` |
| GET | `/api/v1/accounts/:account_id/integrations/linear/teams(.:format)` | `api/v1/accounts/integrations/linear#teams` |
| GET | `/api/v1/accounts/:account_id/integrations/linear/team_entities(.:format)` | `api/v1/accounts/integrations/linear#team_entities` |
| POST | `/api/v1/accounts/:account_id/integrations/linear/create_issue(.:format)` | `api/v1/accounts/integrations/linear#create_issue` |
| POST | `/api/v1/accounts/:account_id/integrations/linear/link_issue(.:format)` | `api/v1/accounts/integrations/linear#link_issue` |
| POST | `/api/v1/accounts/:account_id/integrations/linear/unlink_issue(.:format)` | `api/v1/accounts/integrations/linear#unlink_issue` |
| GET | `/api/v1/accounts/:account_id/integrations/linear/search_issue(.:format)` | `api/v1/accounts/integrations/linear#search_issue` |
| GET | `/api/v1/accounts/:account_id/integrations/linear/linked_issues(.:format)` | `api/v1/accounts/integrations/linear#linked_issues` |
| DELETE | `/api/v1/accounts/:account_id/integrations/notion(.:format)` | `api/v1/accounts/integrations/notion#destroy` |
| POST | `/api/v1/integrations/webhooks(.:format)` | `api/v1/integrations/webhooks#create` |
| POST | `/enterprise/api/v1/accounts/:id/reconnect_shopify(.:format)` | `enterprise/api/v1/shopify#reconnect_shopify` |
| POST | `/webhooks/stripe_app(.:format)` | `webhooks/stripe_app#events` |
| POST | `/webhooks/shopify(.:format)` | `webhooks/shopify#events` |
| GET | `/stripe/callback(.:format)` | `stripe/callbacks#show` |
| GET | `/linear/callback(.:format)` | `linear/callbacks#show` |
| GET | `/shopify/callback(.:format)` | `shopify/callbacks#show` |
| GET | `/notion/callback(.:format)` | `notion/callbacks#show` |

## Database tables (2)

`dashboard_apps`, `integrations_hooks`

## Backend files (103)

### controllers (22)

- `app/controllers/api/v1/accounts/dashboard_apps_controller.rb`
- `app/controllers/api/v1/accounts/integrations/apps_controller.rb`
- `app/controllers/api/v1/accounts/integrations/base_controller.rb`
- `app/controllers/api/v1/accounts/integrations/dyte_controller.rb`
- `app/controllers/api/v1/accounts/integrations/hooks_controller.rb`
- `app/controllers/api/v1/accounts/integrations/linear_controller.rb`
- `app/controllers/api/v1/accounts/integrations/notion_controller.rb`
- `app/controllers/api/v1/accounts/integrations/shopify_controller.rb`
- `app/controllers/api/v1/accounts/integrations/slack_controller.rb`
- `app/controllers/api/v1/accounts/integrations/stripe_controller.rb`
- `app/controllers/api/v1/accounts/notion/authorizations_controller.rb`
- `app/controllers/api/v1/integrations/webhooks_controller.rb`
- `app/controllers/concerns/notion_concern.rb`
- `app/controllers/linear/callbacks_controller.rb`
- `app/controllers/notion/callbacks_controller.rb`
- `app/controllers/shopify/callbacks_controller.rb`
- `app/controllers/slack_uploads_controller.rb`
- `app/controllers/stripe/callbacks_controller.rb`
- `app/controllers/webhooks/shopify_controller.rb`
- `app/controllers/webhooks/stripe_app_controller.rb`
- `enterprise/app/controllers/enterprise/api/v1/accounts/integrations/base_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/api/v1/shopify_controller.rb` (EE)

### helpers (2)

- `app/helpers/linear/integration_helper.rb`
- `app/helpers/shopify/integration_helper.rb`

### jobs (7)

- `app/jobs/crm/setup_job.rb`
- `app/jobs/hook_job.rb`
- `app/jobs/send_on_slack_job.rb`
- `app/jobs/slack_unfurl_job.rb`
- `app/jobs/update_slack_message_job.rb`
- `enterprise/app/jobs/enterprise/billing/shopify_subscription_reconciliation_job.rb` (EE)
- `enterprise/app/jobs/enterprise/billing/shopify_subscription_sync_job.rb` (EE)

### lib (16)

- `lib/dyte.rb`
- `lib/integrations/linear/access_token_service.rb`
- `lib/integrations/linear/auto_link_service.rb`
- `lib/integrations/slack/channel_builder.rb`
- `lib/integrations/slack/emoji_formatter.rb`
- `lib/integrations/slack/hook_builder.rb`
- `lib/integrations/slack/incoming_message_builder.rb`
- `lib/integrations/slack/link_unfurl_formatter.rb`
- `lib/integrations/slack/send_on_slack_service.rb`
- `lib/integrations/slack/signature_verifier.rb`
- `lib/integrations/slack/slack_link_unfurl_service.rb`
- `lib/integrations/slack/slack_message_helper.rb`
- `lib/integrations/slack/update_slack_message_service.rb`
- `lib/linear.rb`
- `lib/linear/mutations.rb`
- `lib/linear/queries.rb`

### listeners (1)

- `app/listeners/hook_listener.rb`

### mailers (1)

- `app/mailers/administrator_notifications/integrations_notification_mailer.rb`

### models (4)

- `app/models/dashboard_app.rb`
- `app/models/integrations.rb`
- `app/models/integrations/app.rb`
- `app/models/integrations/hook.rb`

### policies (2)

- `app/policies/dashboard_app_policy.rb`
- `app/policies/hook_policy.rb`

### services (31)

- `app/services/crm/leadsquared/api/activity_client.rb`
- `app/services/crm/leadsquared/api/base_client.rb`
- `app/services/crm/leadsquared/api/lead_client.rb`
- `app/services/crm/leadsquared/lead_finder_service.rb`
- `app/services/crm/leadsquared/mappers/conversation_mapper.rb`
- `app/services/crm/leadsquared/setup_service.rb`
- `app/services/integrations/stripe/connection.rb`
- `app/services/integrations/stripe/customer_summary.rb`
- `app/services/integrations/stripe/oauth.rb`
- `app/services/integrations/stripe/uninstallation_service.rb`
- `app/services/linear/activity_message_service.rb`
- `app/services/message_templates/hook_execution_service.rb`
- `app/services/shopify/api_context.rb`
- `app/services/shopify/callback_service.rb`
- `app/services/shopify/feature_gate.rb`
- `app/services/shopify/installation_generation.rb`
- `app/services/shopify/installation_service.rb`
- `app/services/shopify/partner_client.rb`
- `app/services/shopify/partner_configuration.rb`
- `app/services/shopify/pending_installation.rb`
- `app/services/shopify/shop_domain.rb`
- `app/services/shopify/signup_service.rb`
- `app/services/shopify/subscription_fetcher.rb`
- `app/services/shopify/subscription_snapshot.rb`
- `app/services/shopify/uninstallation_service.rb`
- `enterprise/app/services/enterprise/billing/shopify_app_pricing_url.rb` (EE)
- `enterprise/app/services/enterprise/billing/shopify_plan_configuration.rb` (EE)
- `enterprise/app/services/enterprise/billing/shopify_subscription_sync_service.rb` (EE)
- `enterprise/app/services/enterprise/message_templates/hook_execution_service.rb` (EE)
- `enterprise/app/services/enterprise/shopify/signup_service.rb` (EE)
- `enterprise/app/services/enterprise/shopify/uninstallation_service.rb` (EE)

### views (17)

- `app/views/api/v1/accounts/dashboard_apps/create.json.jbuilder`
- `app/views/api/v1/accounts/dashboard_apps/index.json.jbuilder`
- `app/views/api/v1/accounts/dashboard_apps/show.json.jbuilder`
- `app/views/api/v1/accounts/dashboard_apps/update.json.jbuilder`
- `app/views/api/v1/accounts/integrations/apps/index.json.jbuilder`
- `app/views/api/v1/accounts/integrations/apps/show.json.jbuilder`
- `app/views/api/v1/accounts/integrations/hooks/create.json.jbuilder`
- `app/views/api/v1/accounts/integrations/hooks/update.json.jbuilder`
- `app/views/api/v1/accounts/integrations/linear/create.json.jbuilder`
- `app/views/api/v1/accounts/integrations/slack/create.json.jbuilder`
- `app/views/api/v1/accounts/integrations/slack/list_all_channels.json.jbuilder`
- `app/views/api/v1/accounts/integrations/slack/update.json.jbuilder`
- `app/views/api/v1/models/_app.json.jbuilder`
- `app/views/api/v1/models/_dashboard_app.json.jbuilder`
- `app/views/api/v1/models/_hook.json.jbuilder`
- `app/views/mailers/administrator_notifications/integrations_notification_mailer/dialogflow_disconnect.liquid`
- `app/views/mailers/administrator_notifications/integrations_notification_mailer/slack_disconnect.liquid`

## Ruby specs (68)

- `spec/controllers/api/v1/accounts/dashboard_apps_controller_spec.rb`
- `spec/controllers/api/v1/accounts/integrations/apps_controller_spec.rb`
- `spec/controllers/api/v1/accounts/integrations/dyte_controller_spec.rb`
- `spec/controllers/api/v1/accounts/integrations/hooks_controller_spec.rb`
- `spec/controllers/api/v1/accounts/integrations/linear_controller_spec.rb`
- `spec/controllers/api/v1/accounts/integrations/shopify_controller_spec.rb`
- `spec/controllers/api/v1/accounts/integrations/stripe_controller_spec.rb`
- `spec/controllers/api/v1/accounts/notion/authorization_controller_spec.rb`
- `spec/controllers/concerns/notion_concern_spec.rb`
- `spec/controllers/linear/callbacks_controller_spec.rb`
- `spec/controllers/notion/callbacks_controller_spec.rb`
- `spec/controllers/shopify/callbacks_controller_spec.rb`
- `spec/controllers/slack_uploads_controller_spec.rb`
- `spec/controllers/stripe/callbacks_controller_spec.rb`
- `spec/controllers/webhooks/shopify_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/integrations/shopify_billing_hook_protection_spec.rb`
- `spec/enterprise/jobs/enterprise/billing/shopify_subscription_reconciliation_job_spec.rb`
- `spec/enterprise/jobs/enterprise/billing/shopify_subscription_sync_job_spec.rb`
- `spec/enterprise/lib/integrations/slack/send_on_slack_service_spec.rb`
- `spec/enterprise/services/enterprise/billing/shopify_subscription_sync_service_spec.rb`
- `spec/enterprise/services/enterprise/message_templates/hook_execution_service_spec.rb`
- `spec/enterprise/services/enterprise/shopify/uninstallation_service_spec.rb`
- `spec/helpers/linear/integration_helper_spec.rb`
- `spec/helpers/shopify/integration_helper_spec.rb`
- `spec/jobs/crm/setup_job_spec.rb`
- `spec/jobs/hook_job_spec.rb`
- `spec/jobs/send_on_slack_job_spec.rb`
- `spec/jobs/slack_unfurl_job_spec.rb`
- `spec/jobs/update_slack_message_job_spec.rb`
- `spec/lib/dyte_spec.rb`
- `spec/lib/integrations/linear/access_token_service_spec.rb`
- `spec/lib/integrations/linear/auto_link_service_spec.rb`
- `spec/lib/integrations/slack/emoji_formatter_spec.rb`
- `spec/lib/integrations/slack/hook_builder_spec.rb`
- `spec/lib/integrations/slack/incoming_message_builder_spec.rb`
- `spec/lib/integrations/slack/link_unfurl_formatter_spec.rb`
- `spec/lib/integrations/slack/send_on_slack_service_spec.rb`
- `spec/lib/integrations/slack/slack_link_unfurl_service_spec.rb`
- `spec/lib/integrations/slack/update_slack_message_service_spec.rb`
- `spec/lib/linear_spec.rb`
- `spec/listeners/hook_listener_spec.rb`
- `spec/mailers/administrator_notifications/integrations_notification_mailer_spec.rb`
- `spec/models/integrations/app_spec.rb`
- `spec/models/integrations/hook_spec.rb`
- `spec/requests/api/v1/accounts/integrations/slack_request_spec.rb`
- `spec/requests/api/v1/integrations/webhooks_request_spec.rb`
- `spec/services/crm/leadsquared/api/activity_client_spec.rb`
- `spec/services/crm/leadsquared/api/base_client_spec.rb`
- `spec/services/crm/leadsquared/api/lead_client_spec.rb`
- `spec/services/crm/leadsquared/lead_finder_service_spec.rb`
- `spec/services/crm/leadsquared/mappers/conversation_mapper_spec.rb`
- `spec/services/crm/leadsquared/setup_service_spec.rb`
- `spec/services/integrations/stripe/connection_spec.rb`
- `spec/services/integrations/stripe/customer_summary_spec.rb`
- `spec/services/integrations/stripe/oauth_spec.rb`
- `spec/services/integrations/stripe/uninstallation_service_spec.rb`
- `spec/services/linear/activity_message_service_spec.rb`
- `spec/services/message_templates/hook_execution_service_spec.rb`
- `spec/services/shopify/api_context_spec.rb`
- `spec/services/shopify/feature_gate_spec.rb`
- `spec/services/shopify/partner_client_spec.rb`
- `spec/services/shopify/partner_configuration_spec.rb`
- `spec/services/shopify/pending_installation_spec.rb`
- `spec/services/shopify/shop_domain_spec.rb`
- `spec/services/shopify/signup_service_spec.rb`
- `spec/services/shopify/subscription_fetcher_spec.rb`
- `spec/services/shopify/subscription_snapshot_spec.rb`
- `spec/services/shopify/uninstallation_service_spec.rb`

## Frontend files (54)

- `app/javascript/dashboard/api/integrations.js`
- `app/javascript/dashboard/api/integrations/dyte.js`
- `app/javascript/dashboard/api/integrations/linear.js`
- `app/javascript/dashboard/api/integrations/shopify.js`
- `app/javascript/dashboard/api/integrations/stripe.js`
- `app/javascript/dashboard/api/notion_auth.js`
- `app/javascript/dashboard/api/specs/integrations.spec.js`
- `app/javascript/dashboard/api/specs/integrations/dyte.spec.js`
- `app/javascript/dashboard/api/specs/integrations/linear.spec.js`
- `app/javascript/dashboard/components-next/integration-card/IntegrationCard.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Dyte.vue`
- `app/javascript/dashboard/composables/spec/useIntegrationHook.spec.js`
- `app/javascript/dashboard/composables/useIntegrationHook.js`
- `app/javascript/dashboard/routes/dashboard/settings/billing/ShopifyBilling.vue`
- `app/javascript/dashboard/routes/dashboard/settings/billing/specs/ShopifyBilling.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/DashboardApps/DashboardAppModal.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/DashboardApps/DashboardAppsRow.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/DashboardApps/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/GoogleTranslate.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Integration.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/IntegrationHooks.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/IntegrationItem.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Linear.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/MultipleIntegrationHooks.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/NewHook.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Notion.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Shopify.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/ShowIntegration.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/SingleIntegrationHooks.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Slack.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Slack/SelectChannelWarning.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Slack/SlackIntegrationHelpText.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Slack/SlackMessageMode.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Stripe.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/EditWebHook.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/NewWebHook.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/WebhookForm.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/WebhookPaywall.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/WebhookRow.vue`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/hookMixin.js`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/integrations.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/specs/Stripe.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/specs/hookMixin.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/integrations/specs/integrations.routes.spec.js`
- `app/javascript/dashboard/routes/dashboard/shopify/SelectAccount.vue`
- `app/javascript/dashboard/store/modules/conversations/actions/messageTranslateActions.js`
- `app/javascript/dashboard/store/modules/integrations.js`
- `app/javascript/dashboard/store/modules/specs/integrations/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/integrations/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/integrations/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/integrations/mutations.spec.js`
- `app/javascript/shared/helpers/IntegrationHelper.js`
