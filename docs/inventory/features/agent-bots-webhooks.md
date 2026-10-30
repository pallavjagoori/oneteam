# Agent bots and webhooks

**Area:** Integrations

Agent bots that act on conversations and outgoing account webhooks.

**Feature flags:** `agent_bots`, `api_and_webhooks`

## HTTP routes (31)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/agent_bots/:id/reset_access_token(.:format)` | `api/v1/accounts/agent_bots#reset_access_token` |
| POST | `/api/v1/accounts/:account_id/agent_bots/:id/reset_secret(.:format)` | `api/v1/accounts/agent_bots#reset_secret` |
| GET | `/api/v1/accounts/:account_id/agent_bots(.:format)` | `api/v1/accounts/agent_bots#index` |
| POST | `/api/v1/accounts/:account_id/agent_bots(.:format)` | `api/v1/accounts/agent_bots#create` |
| GET | `/api/v1/accounts/:account_id/agent_bots/:id(.:format)` | `api/v1/accounts/agent_bots#show` |
| PATCH | `/api/v1/accounts/:account_id/agent_bots/:id(.:format)` | `api/v1/accounts/agent_bots#update` |
| PUT | `/api/v1/accounts/:account_id/agent_bots/:id(.:format)` | `api/v1/accounts/agent_bots#update` |
| DELETE | `/api/v1/accounts/:account_id/agent_bots/:id(.:format)` | `api/v1/accounts/agent_bots#destroy` |
| GET | `/api/v1/accounts/:account_id/inboxes/:id/agent_bot(.:format)` | `api/v1/accounts/inboxes#agent_bot` |
| POST | `/api/v1/accounts/:account_id/inboxes/:id/set_agent_bot(.:format)` | `api/v1/accounts/inboxes#set_agent_bot` |
| POST | `/api/v1/accounts/:account_id/inboxes/:id/register_webhook(.:format)` | `api/v1/accounts/inboxes#register_webhook` |
| GET | `/api/v1/accounts/:account_id/webhooks(.:format)` | `api/v1/accounts/webhooks#index` |
| POST | `/api/v1/accounts/:account_id/webhooks(.:format)` | `api/v1/accounts/webhooks#create` |
| PATCH | `/api/v1/accounts/:account_id/webhooks/:id(.:format)` | `api/v1/accounts/webhooks#update` |
| PUT | `/api/v1/accounts/:account_id/webhooks/:id(.:format)` | `api/v1/accounts/webhooks#update` |
| DELETE | `/api/v1/accounts/:account_id/webhooks/:id(.:format)` | `api/v1/accounts/webhooks#destroy` |
| POST | `/enterprise/webhooks/stripe(.:format)` | `enterprise/webhooks/stripe#process_payload` |
| GET | `/platform/api/v1/agent_bots(.:format)` | `platform/api/v1/agent_bots#index` |
| POST | `/platform/api/v1/agent_bots(.:format)` | `platform/api/v1/agent_bots#create` |
| GET | `/platform/api/v1/agent_bots/:id(.:format)` | `platform/api/v1/agent_bots#show` |
| PATCH | `/platform/api/v1/agent_bots/:id(.:format)` | `platform/api/v1/agent_bots#update` |
| PUT | `/platform/api/v1/agent_bots/:id(.:format)` | `platform/api/v1/agent_bots#update` |
| DELETE | `/platform/api/v1/agent_bots/:id(.:format)` | `platform/api/v1/agent_bots#destroy` |
| GET | `/super_admin/agent_bots(.:format)` | `super_admin/agent_bots#index` |
| POST | `/super_admin/agent_bots(.:format)` | `super_admin/agent_bots#create` |
| GET | `/super_admin/agent_bots/new(.:format)` | `super_admin/agent_bots#new` |
| GET | `/super_admin/agent_bots/:id/edit(.:format)` | `super_admin/agent_bots#edit` |
| GET | `/super_admin/agent_bots/:id(.:format)` | `super_admin/agent_bots#show` |
| PATCH | `/super_admin/agent_bots/:id(.:format)` | `super_admin/agent_bots#update` |
| PUT | `/super_admin/agent_bots/:id(.:format)` | `super_admin/agent_bots#update` |
| DELETE | `/super_admin/agent_bots/:id(.:format)` | `super_admin/agent_bots#destroy` |

## Database tables (3)

`agent_bot_inboxes`, `agent_bots`, `webhooks`

## Backend files (40)

### controllers (6)

- `app/controllers/api/v1/accounts/agent_bots_controller.rb`
- `app/controllers/api/v1/accounts/webhooks_controller.rb`
- `app/controllers/api/v1/webhooks_controller.rb`
- `app/controllers/platform/api/v1/agent_bots_controller.rb`
- `app/controllers/super_admin/agent_bots_controller.rb`
- `enterprise/app/controllers/enterprise/webhooks/stripe_controller.rb` (EE)

### dashboards (1)

- `app/dashboards/agent_bot_dashboard.rb`

### jobs (3)

- `app/jobs/agent_bots/webhook_job.rb`
- `app/jobs/webhook_job.rb`
- `app/jobs/webhooks/line_events_job.rb`

### lib (1)

- `lib/webhooks/trigger.rb`

### listeners (3)

- `app/listeners/agent_bot_listener.rb`
- `app/listeners/installation_webhook_listener.rb`
- `app/listeners/webhook_listener.rb`

### models (4)

- `app/models/agent_bot.rb`
- `app/models/agent_bot_inbox.rb`
- `app/models/concerns/webhook_secretable.rb`
- `app/models/webhook.rb`

### policies (2)

- `app/policies/agent_bot_policy.rb`
- `app/policies/webhook_policy.rb`

### presenters (1)

- `app/presenters/agent_bot_presenter.rb`

### services (1)

- `app/services/messages/webhook_content_normalizer.rb`

### views (18)

- `app/views/api/v1/accounts/agent_bots/create.json.jbuilder`
- `app/views/api/v1/accounts/agent_bots/index.json.jbuilder`
- `app/views/api/v1/accounts/agent_bots/reset_access_token.json.jbuilder`
- `app/views/api/v1/accounts/agent_bots/reset_secret.json.jbuilder`
- `app/views/api/v1/accounts/agent_bots/show.json.jbuilder`
- `app/views/api/v1/accounts/agent_bots/update.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/agent_bot.json.jbuilder`
- `app/views/api/v1/accounts/webhooks/_webhook.json.jbuilder`
- `app/views/api/v1/accounts/webhooks/create.json.jbuilder`
- `app/views/api/v1/accounts/webhooks/index.json.jbuilder`
- `app/views/api/v1/accounts/webhooks/update.json.jbuilder`
- `app/views/api/v1/models/_agent_bot.json.jbuilder`
- `app/views/api/v1/models/_agent_bot_slim.json.jbuilder`
- `app/views/platform/api/v1/agent_bots/create.json.jbuilder`
- `app/views/platform/api/v1/agent_bots/index.json.jbuilder`
- `app/views/platform/api/v1/agent_bots/show.json.jbuilder`
- `app/views/platform/api/v1/agent_bots/update.json.jbuilder`
- `app/views/platform/api/v1/models/_agent_bot.json.jbuilder`

## Ruby specs (16)

- `spec/controllers/api/v1/accounts/agent_bots_controller_spec.rb`
- `spec/controllers/api/v1/accounts/webhook_controller_spec.rb`
- `spec/controllers/platform/api/v1/agent_bots_controller_spec.rb`
- `spec/controllers/super_admin/agent_bots_controller_spec.rb`
- `spec/enterprise/models/webhook_spec.rb`
- `spec/jobs/agent_bots/webhook_job_spec.rb`
- `spec/jobs/webhook_job_spec.rb`
- `spec/jobs/webhooks/line_events_job_spec.rb`
- `spec/lib/webhooks/trigger_spec.rb`
- `spec/listeners/agent_bot_listener_spec.rb`
- `spec/listeners/installation_webhook_listener_spec.rb`
- `spec/listeners/webhook_listener_spec.rb`
- `spec/models/agent_bot_inbox_spec.rb`
- `spec/models/agent_bot_spec.rb`
- `spec/models/webhook_spec.rb`
- `spec/services/messages/webhook_content_normalizer_spec.rb`

## Frontend files (17)

- `app/javascript/dashboard/api/agentBots.js`
- `app/javascript/dashboard/api/specs/agentBots.spec.js`
- `app/javascript/dashboard/api/specs/webhook.spec.js`
- `app/javascript/dashboard/api/webhooks.js`
- `app/javascript/dashboard/routes/dashboard/settings/agentBots/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/agentBots/agentBot.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/agentBots/components/AgentBotModal.vue`
- `app/javascript/dashboard/store/modules/agentBots.js`
- `app/javascript/dashboard/store/modules/specs/agentBots/agentBots.spec.js`
- `app/javascript/dashboard/store/modules/specs/agentBots/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/agentBots/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/agentBots/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/webhooks/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/webhooks/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/webhooks/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/webhooks/mutations.spec.js`
- `app/javascript/dashboard/store/modules/webhooks.js`
