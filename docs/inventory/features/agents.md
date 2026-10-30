# Agents and availability

**Area:** Collaboration

Agent management, invitations, roles, availability and online presence.

**Feature flags:** `agent_management`

## HTTP routes (11)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/app/accounts/:account_id/settings/inboxes/new/:inbox_id/agents(.:format)` | `dashboard#index` |
| GET | `/app/accounts/:account_id/settings/inboxes/new/:inbox_id/agents(.:format)` | `dashboard#index` |
| GET | `/app/accounts/:account_id/settings/inboxes/new/:inbox_id/agents(.:format)` | `dashboard#index` |
| GET | `/app/accounts/:account_id/settings/inboxes/new/:inbox_id/agents(.:format)` | `dashboard#index` |
| POST | `/api/v1/accounts/:account_id/agents/bulk_create(.:format)` | `api/v1/accounts/agents#bulk_create` |
| GET | `/api/v1/accounts/:account_id/agents(.:format)` | `api/v1/accounts/agents#index` |
| POST | `/api/v1/accounts/:account_id/agents(.:format)` | `api/v1/accounts/agents#create` |
| PATCH | `/api/v1/accounts/:account_id/agents/:id(.:format)` | `api/v1/accounts/agents#update` |
| PUT | `/api/v1/accounts/:account_id/agents/:id(.:format)` | `api/v1/accounts/agents#update` |
| DELETE | `/api/v1/accounts/:account_id/agents/:id(.:format)` | `api/v1/accounts/agents#destroy` |
| POST | `/api/v1/profile/availability(.:format)` | `api/v1/profiles#availability` |

## Database tables (1)

`leaves`

## Backend files (17)

### builders (2)

- `app/builders/agent_builder.rb`
- `enterprise/app/builders/enterprise/agent_builder.rb` (EE)

### controllers (2)

- `app/controllers/api/v1/accounts/agents_controller.rb`
- `enterprise/app/controllers/enterprise/api/v1/accounts/agents_controller.rb` (EE)

### helpers (1)

- `app/helpers/api/v1/agents_helper.rb`

### jobs (1)

- `app/jobs/agents/destroy_job.rb`

### lib (1)

- `lib/online_status_tracker.rb`

### models (4)

- `app/models/concerns/availability_statusable.rb`
- `app/models/concerns/inbox_agent_availability.rb`
- `enterprise/app/models/concerns/agentable.rb` (EE)
- `enterprise/app/models/enterprise/inbox_agent_availability.rb` (EE)

### views (6)

- `app/views/api/v1/accounts/agents/create.json.jbuilder`
- `app/views/api/v1/accounts/agents/index.json.jbuilder`
- `app/views/api/v1/accounts/agents/update.json.jbuilder`
- `app/views/api/v1/accounts/search/_agent.json.jbuilder`
- `app/views/api/v1/models/_agent.json.jbuilder`
- `app/views/api/v1/profiles/availability.jbuilder`

## Ruby specs (8)

- `spec/builders/agent_builder_spec.rb`
- `spec/controllers/api/v1/accounts/agents_controller_spec.rb`
- `spec/enterprise/builders/agent_builder_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/agents_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/agents_controller_spec.rb`
- `spec/enterprise/models/concerns/agentable_spec.rb`
- `spec/jobs/agents/destroy_job_spec.rb`
- `spec/lib/online_status_tracker_spec.rb`

## Frontend files (19)

- `app/javascript/dashboard/api/agents.js`
- `app/javascript/dashboard/api/specs/agents.spec.js`
- `app/javascript/dashboard/composables/spec/fixtures/agentFixtures.js`
- `app/javascript/dashboard/composables/spec/useAgentsList.spec.js`
- `app/javascript/dashboard/composables/useAgentsList.js`
- `app/javascript/dashboard/helper/agentHelper.js`
- `app/javascript/dashboard/helper/specs/agentHelper.spec.js`
- `app/javascript/dashboard/helper/specs/fixtures/agentFixtures.js`
- `app/javascript/dashboard/routes/dashboard/settings/agents/AddAgent.vue`
- `app/javascript/dashboard/routes/dashboard/settings/agents/EditAgent.vue`
- `app/javascript/dashboard/routes/dashboard/settings/agents/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/agents/agent.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/AddAgents.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/WeeklyAvailability.vue`
- `app/javascript/dashboard/store/modules/agents.js`
- `app/javascript/dashboard/store/modules/specs/agents/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/agents/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/agents/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/agents/mutations.spec.js`
