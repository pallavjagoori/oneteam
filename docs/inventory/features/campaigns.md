# Campaigns

**Area:** Engagement

Ongoing website campaigns and one-off SMS and WhatsApp broadcast campaigns, with analytics.

**Feature flags:** `campaigns`, `campaign_analytics`

## HTTP routes (10)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/campaigns/:campaign_id/analytics/metrics(.:format)` | `api/v1/accounts/campaigns/analytics#metrics` |
| GET | `/api/v1/accounts/:account_id/campaigns/:campaign_id/analytics/contacts(.:format)` | `api/v1/accounts/campaigns/analytics#contacts` |
| GET | `/api/v1/accounts/:account_id/campaigns(.:format)` | `api/v1/accounts/campaigns#index` |
| POST | `/api/v1/accounts/:account_id/campaigns(.:format)` | `api/v1/accounts/campaigns#create` |
| GET | `/api/v1/accounts/:account_id/campaigns/:id(.:format)` | `api/v1/accounts/campaigns#show` |
| PATCH | `/api/v1/accounts/:account_id/campaigns/:id(.:format)` | `api/v1/accounts/campaigns#update` |
| PUT | `/api/v1/accounts/:account_id/campaigns/:id(.:format)` | `api/v1/accounts/campaigns#update` |
| DELETE | `/api/v1/accounts/:account_id/campaigns/:id(.:format)` | `api/v1/accounts/campaigns#destroy` |
| GET | `/api/v1/accounts/:account_id/conversations/:conversation_id/campaign_history(.:format)` | `api/v1/accounts/conversations/campaign_history#index` |
| GET | `/api/v1/accounts/:account_id/inboxes/:id/campaigns(.:format)` | `api/v1/accounts/inboxes#campaigns` |

## Database tables (2)

`campaign_recipients`, `campaigns`

## Backend files (18)

### builders (1)

- `app/builders/campaigns/campaign_conversation_builder.rb`

### controllers (3)

- `app/controllers/api/v1/accounts/campaigns_controller.rb`
- `enterprise/app/controllers/api/v1/accounts/campaigns/analytics_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/conversations/campaign_history_controller.rb` (EE)

### jobs (2)

- `app/jobs/campaigns/trigger_oneoff_campaign_job.rb`
- `enterprise/app/jobs/campaigns/update_recipient_status_job.rb` (EE)

### listeners (1)

- `app/listeners/campaign_listener.rb`

### models (3)

- `app/models/campaign.rb`
- `enterprise/app/models/campaign_recipient.rb` (EE)
- `enterprise/app/models/enterprise/campaign.rb` (EE)

### policies (1)

- `app/policies/campaign_policy.rb`

### services (1)

- `app/services/liquid/campaign_template_service.rb`

### views (6)

- `app/views/api/v1/accounts/campaigns/create.json.jbuilder`
- `app/views/api/v1/accounts/campaigns/index.json.jbuilder`
- `app/views/api/v1/accounts/campaigns/show.json.jbuilder`
- `app/views/api/v1/accounts/campaigns/update.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/campaigns.json.jbuilder`
- `app/views/api/v1/models/_campaign.json.jbuilder`

## Ruby specs (10)

- `spec/builders/campaigns/campaign_conversation_builder_spec.rb`
- `spec/controllers/api/v1/accounts/campaigns_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/campaigns/analytics_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/conversations/campaign_history_controller_spec.rb`
- `spec/enterprise/jobs/campaigns/update_recipient_status_job_spec.rb`
- `spec/enterprise/models/campaign_recipient_spec.rb`
- `spec/jobs/campaigns/trigger_oneoff_campaign_job_spec.rb`
- `spec/listeners/campaign_listener_spec.rb`
- `spec/models/campaign_spec.rb`
- `spec/services/liquid/campaign_template_service_spec.rb`

## Frontend files (32)

- `app/javascript/dashboard/api/campaigns.js`
- `app/javascript/dashboard/api/specs/campaign.spec.js`
- `app/javascript/dashboard/components-next/Campaigns/CampaignAnalyticsLayout.vue`
- `app/javascript/dashboard/components-next/Campaigns/CampaignCard/CampaignCard.vue`
- `app/javascript/dashboard/components-next/Campaigns/CampaignCard/LiveChatCampaignDetails.vue`
- `app/javascript/dashboard/components-next/Campaigns/CampaignLayout.vue`
- `app/javascript/dashboard/components-next/Campaigns/EmptyState/CampaignEmptyStateContent.js`
- `app/javascript/dashboard/components-next/Campaigns/EmptyState/LiveChatCampaignEmptyState.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignAnalyticsPage/CampaignDeliveryBreakdown.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignAnalyticsPage/CampaignDeliveryTable.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignAnalyticsPage/CampaignMetricCard.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignAnalyticsPage/DeliveryStatusBadge.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignPage/CampaignList.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignPage/ConfirmDeleteCampaignDialog.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignPage/LiveChatCampaign/EditLiveChatCampaignDialog.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignPage/LiveChatCampaign/LiveChatCampaignDialog.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignPage/LiveChatCampaign/LiveChatCampaignForm.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignPage/specs/CampaignList.spec.js`
- `app/javascript/dashboard/components-next/message/CampaignMessage.vue`
- `app/javascript/dashboard/components-next/message/specs/CampaignMessage.spec.js`
- `app/javascript/dashboard/composables/spec/useCampaignHistory.spec.js`
- `app/javascript/dashboard/composables/useCampaignAnalytics.js`
- `app/javascript/dashboard/composables/useCampaignHistory.js`
- `app/javascript/dashboard/routes/dashboard/campaigns/campaigns.routes.js`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/CampaignsPageRouteView.vue`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/LiveChatCampaignsPage.vue`
- `app/javascript/dashboard/store/modules/campaigns.js`
- `app/javascript/dashboard/store/modules/specs/campaigns/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/campaigns/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/campaigns/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/campaigns/mutations.spec.js`
- `app/javascript/shared/constants/campaign.js`
