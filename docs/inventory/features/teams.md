# Teams

**Area:** Collaboration

Teams of agents, team membership and team assignment.

**Feature flags:** `team_management`, `contact_chatwoot_support_team`

## HTTP routes (12)

| Verb | Path | Controller#action |
| --- | --- | --- |
| DELETE | `/api/v1/accounts/:account_id/teams/:team_id/team_members(.:format)` | `api/v1/accounts/team_members#destroy` |
| PATCH | `/api/v1/accounts/:account_id/teams/:team_id/team_members(.:format)` | `api/v1/accounts/team_members#update` |
| GET | `/api/v1/accounts/:account_id/teams/:team_id/team_members(.:format)` | `api/v1/accounts/team_members#index` |
| POST | `/api/v1/accounts/:account_id/teams/:team_id/team_members(.:format)` | `api/v1/accounts/team_members#create` |
| GET | `/api/v1/accounts/:account_id/teams(.:format)` | `api/v1/accounts/teams#index` |
| POST | `/api/v1/accounts/:account_id/teams(.:format)` | `api/v1/accounts/teams#create` |
| GET | `/api/v1/accounts/:account_id/teams/new(.:format)` | `api/v1/accounts/teams#new` |
| GET | `/api/v1/accounts/:account_id/teams/:id/edit(.:format)` | `api/v1/accounts/teams#edit` |
| GET | `/api/v1/accounts/:account_id/teams/:id(.:format)` | `api/v1/accounts/teams#show` |
| PATCH | `/api/v1/accounts/:account_id/teams/:id(.:format)` | `api/v1/accounts/teams#update` |
| PUT | `/api/v1/accounts/:account_id/teams/:id(.:format)` | `api/v1/accounts/teams#update` |
| DELETE | `/api/v1/accounts/:account_id/teams/:id(.:format)` | `api/v1/accounts/teams#destroy` |

## Database tables (2)

`team_members`, `teams`

## Backend files (14)

### controllers (2)

- `app/controllers/api/v1/accounts/team_members_controller.rb`
- `app/controllers/api/v1/accounts/teams_controller.rb`

### models (3)

- `app/models/concerns/team_activity_message_handler.rb`
- `app/models/team.rb`
- `app/models/team_member.rb`

### policies (2)

- `app/policies/team_member_policy.rb`
- `app/policies/team_policy.rb`

### views (7)

- `app/views/api/v1/accounts/team_members/create.json.jbuilder`
- `app/views/api/v1/accounts/team_members/index.json.jbuilder`
- `app/views/api/v1/accounts/teams/create.json.jbuilder`
- `app/views/api/v1/accounts/teams/index.json.jbuilder`
- `app/views/api/v1/accounts/teams/show.json.jbuilder`
- `app/views/api/v1/accounts/teams/update.json.jbuilder`
- `app/views/api/v1/models/_team.json.jbuilder`

## Ruby specs (6)

- `spec/controllers/api/v1/accounts/team_members_controller_spec.rb`
- `spec/controllers/api/v1/accounts/teams_controller_spec.rb`
- `spec/enterprise/models/team_member_spec.rb`
- `spec/enterprise/models/team_spec.rb`
- `spec/models/team_member_spec.rb`
- `spec/models/team_spec.rb`

## Frontend files (28)

- `app/javascript/dashboard/api/specs/teams.spec.js`
- `app/javascript/dashboard/api/teams.js`
- `app/javascript/dashboard/routes/dashboard/settings/teams/AgentSelector.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/Create/AddAgents.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/Create/CreateTeam.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/Create/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/Edit/EditAgents.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/Edit/EditTeam.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/Edit/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/FinishSetup.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/TeamForm.vue`
- `app/javascript/dashboard/routes/dashboard/settings/teams/helpers/validations.js`
- `app/javascript/dashboard/routes/dashboard/settings/teams/teams.routes.js`
- `app/javascript/dashboard/store/modules/specs/teamMembers/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/teamMembers/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/teamMembers/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/teamMembers/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/teams/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/teams/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/teams/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/teams/mutations.spec.js`
- `app/javascript/dashboard/store/modules/teamMembers.js`
- `app/javascript/dashboard/store/modules/teams/actions.js`
- `app/javascript/dashboard/store/modules/teams/getters.js`
- `app/javascript/dashboard/store/modules/teams/index.js`
- `app/javascript/dashboard/store/modules/teams/mutations.js`
- `app/javascript/dashboard/store/modules/teams/types.js`
