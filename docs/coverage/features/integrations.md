# Integrations: coverage gaps

## Frontend: 87.0% (892 of 1025 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/WebhookForm.vue` | 39.1% | 14 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Integration.vue` | 61.3% | 12 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Slack/SelectChannelWarning.vue` | 64.7% | 12 |
| `app/javascript/dashboard/routes/dashboard/settings/billing/ShopifyBilling.vue` | 89.2% | 10 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Notion.vue` | 54.5% | 10 |
| `app/javascript/dashboard/components-next/message/bubbles/Dyte.vue` | 52.6% | 9 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Stripe.vue` | 89.0% | 9 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/NewWebHook.vue` | 60.9% | 9 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Index.vue` | 57.9% | 8 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/WebhookRow.vue` | 55.6% | 8 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Linear.vue` | 62.5% | 6 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/DashboardApps/DashboardAppsRow.vue` | 33.3% | 6 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/EditWebHook.vue` | 25.0% | 6 |
| `app/javascript/dashboard/routes/dashboard/shopify/SelectAccount.vue` | 70.0% | 6 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Slack/SlackMessageMode.vue` | 73.3% | 4 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/SingleIntegrationHooks.vue` | 85.7% | 2 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/IntegrationItem.vue` | 95.7% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/Webhooks/WebhookPaywall.vue` | 80.0% | 1 |

## Backend: 98.3% (2790 of 2837 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/controllers/api/v1/accounts/integrations/stripe_controller.rb` | 86.1% | 5 |
| `app/controllers/shopify/callbacks_controller.rb` | 97.3% | 3 |
| `app/services/crm/leadsquared/setup_service.rb` | 94.3% | 3 |
| `app/services/shopify/signup_service.rb` | 96.5% | 3 |
| `app/controllers/api/v1/accounts/integrations/hooks_controller.rb` | 93.8% | 2 |
| `app/controllers/stripe/callbacks_controller.rb` | 95.2% | 2 |
| `app/jobs/slack_unfurl_job.rb` | 92.3% | 2 |
| `app/models/integrations/app.rb` | 97.1% | 2 |
| `app/models/integrations/hook.rb` | 98.1% | 2 |
| `enterprise/app/services/enterprise/billing/shopify_subscription_sync_service.rb` | 97.6% | 2 |
| `lib/integrations/linear/access_token_service.rb` | 96.2% | 2 |
| `lib/integrations/slack/update_slack_message_service.rb` | 97.5% | 2 |
| `app/controllers/api/v1/accounts/integrations/linear_controller.rb` | 98.6% | 1 |
| `app/controllers/api/v1/accounts/integrations/slack_controller.rb` | 95.8% | 1 |
| `app/controllers/api/v1/accounts/notion/authorizations_controller.rb` | 85.7% | 1 |
| `app/controllers/concerns/notion_concern.rb` | 88.9% | 1 |
| `app/controllers/linear/callbacks_controller.rb` | 97.7% | 1 |
| `app/controllers/notion/callbacks_controller.rb` | 92.3% | 1 |
| `app/controllers/slack_uploads_controller.rb` | 94.1% | 1 |
| `app/jobs/hook_job.rb` | 97.7% | 1 |
| `app/services/crm/leadsquared/api/activity_client.rb` | 93.8% | 1 |
| `app/services/crm/leadsquared/api/lead_client.rb` | 96.9% | 1 |
| `app/services/integrations/stripe/oauth.rb` | 97.6% | 1 |
| `app/services/shopify/partner_client.rb` | 97.2% | 1 |
| `app/services/shopify/partner_configuration.rb` | 97.1% | 1 |
| `enterprise/app/services/enterprise/billing/shopify_app_pricing_url.rb` | 96.2% | 1 |
| `enterprise/app/services/enterprise/billing/shopify_plan_configuration.rb` | 97.6% | 1 |
| `lib/integrations/slack/hook_builder.rb` | 94.4% | 1 |
| `lib/integrations/slack/incoming_message_builder.rb` | 98.0% | 1 |
