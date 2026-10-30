# Auto-assignment and capacity

**Area:** Operations

Automatic conversation assignment, assignment policies, round robin and agent capacity limits.

**Feature flags:** `assignment_v2`, `advanced_assignment`

## HTTP routes (30)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/assignable_agents(.:format)` | `api/v1/accounts/assignable_agents#index` |
| GET | `/api/v1/accounts/:account_id/agent_capacity_policies/:agent_capacity_policy_id/users(.:format)` | `api/v1/accounts/agent_capacity_policies/users#index` |
| POST | `/api/v1/accounts/:account_id/agent_capacity_policies/:agent_capacity_policy_id/users(.:format)` | `api/v1/accounts/agent_capacity_policies/users#create` |
| DELETE | `/api/v1/accounts/:account_id/agent_capacity_policies/:agent_capacity_policy_id/users/:id(.:format)` | `api/v1/accounts/agent_capacity_policies/users#destroy` |
| POST | `/api/v1/accounts/:account_id/agent_capacity_policies/:agent_capacity_policy_id/inbox_limits(.:format)` | `api/v1/accounts/agent_capacity_policies/inbox_limits#create` |
| PATCH | `/api/v1/accounts/:account_id/agent_capacity_policies/:agent_capacity_policy_id/inbox_limits/:id(.:format)` | `api/v1/accounts/agent_capacity_policies/inbox_limits#update` |
| PUT | `/api/v1/accounts/:account_id/agent_capacity_policies/:agent_capacity_policy_id/inbox_limits/:id(.:format)` | `api/v1/accounts/agent_capacity_policies/inbox_limits#update` |
| DELETE | `/api/v1/accounts/:account_id/agent_capacity_policies/:agent_capacity_policy_id/inbox_limits/:id(.:format)` | `api/v1/accounts/agent_capacity_policies/inbox_limits#destroy` |
| GET | `/api/v1/accounts/:account_id/agent_capacity_policies(.:format)` | `api/v1/accounts/agent_capacity_policies#index` |
| POST | `/api/v1/accounts/:account_id/agent_capacity_policies(.:format)` | `api/v1/accounts/agent_capacity_policies#create` |
| GET | `/api/v1/accounts/:account_id/agent_capacity_policies/:id(.:format)` | `api/v1/accounts/agent_capacity_policies#show` |
| PATCH | `/api/v1/accounts/:account_id/agent_capacity_policies/:id(.:format)` | `api/v1/accounts/agent_capacity_policies#update` |
| PUT | `/api/v1/accounts/:account_id/agent_capacity_policies/:id(.:format)` | `api/v1/accounts/agent_capacity_policies#update` |
| DELETE | `/api/v1/accounts/:account_id/agent_capacity_policies/:id(.:format)` | `api/v1/accounts/agent_capacity_policies#destroy` |
| POST | `/api/v1/accounts/:account_id/conversations/:conversation_id/assignments(.:format)` | `api/v1/accounts/conversations/assignments#create` |
| GET | `/api/v1/accounts/:account_id/inboxes/:id/assignable_agents(.:format)` | `api/v1/accounts/inboxes#assignable_agents` |
| GET | `/api/v1/accounts/:account_id/assignment_policies/:assignment_policy_id/inboxes(.:format)` | `api/v1/accounts/assignment_policies/inboxes#index` |
| POST | `/api/v1/accounts/:account_id/assignment_policies/:assignment_policy_id/inboxes(.:format)` | `api/v1/accounts/assignment_policies/inboxes#create` |
| DELETE | `/api/v1/accounts/:account_id/assignment_policies/:assignment_policy_id/inboxes/:id(.:format)` | `api/v1/accounts/assignment_policies/inboxes#destroy` |
| GET | `/api/v1/accounts/:account_id/assignment_policies(.:format)` | `api/v1/accounts/assignment_policies#index` |
| POST | `/api/v1/accounts/:account_id/assignment_policies(.:format)` | `api/v1/accounts/assignment_policies#create` |
| GET | `/api/v1/accounts/:account_id/assignment_policies/new(.:format)` | `api/v1/accounts/assignment_policies#new` |
| GET | `/api/v1/accounts/:account_id/assignment_policies/:id/edit(.:format)` | `api/v1/accounts/assignment_policies#edit` |
| GET | `/api/v1/accounts/:account_id/assignment_policies/:id(.:format)` | `api/v1/accounts/assignment_policies#show` |
| PATCH | `/api/v1/accounts/:account_id/assignment_policies/:id(.:format)` | `api/v1/accounts/assignment_policies#update` |
| PUT | `/api/v1/accounts/:account_id/assignment_policies/:id(.:format)` | `api/v1/accounts/assignment_policies#update` |
| DELETE | `/api/v1/accounts/:account_id/assignment_policies/:id(.:format)` | `api/v1/accounts/assignment_policies#destroy` |
| GET | `/api/v1/accounts/:account_id/inboxes/:inbox_id/assignment_policy(.:format)` | `api/v1/accounts/inboxes/assignment_policies#show` |
| DELETE | `/api/v1/accounts/:account_id/inboxes/:inbox_id/assignment_policy(.:format)` | `api/v1/accounts/inboxes/assignment_policies#destroy` |
| POST | `/api/v1/accounts/:account_id/inboxes/:inbox_id/assignment_policy(.:format)` | `api/v1/accounts/inboxes/assignment_policies#create` |

## Database tables (4)

`agent_capacity_policies`, `assignment_policies`, `inbox_assignment_policies`, `inbox_capacity_limits`

## Backend files (54)

### controllers (11)

- `app/controllers/api/v1/accounts/assignable_agents_controller.rb`
- `app/controllers/api/v1/accounts/assignment_policies/inboxes_controller.rb`
- `app/controllers/api/v1/accounts/assignment_policies_controller.rb`
- `app/controllers/api/v1/accounts/conversations/assignments_controller.rb`
- `app/controllers/api/v1/accounts/inboxes/assignment_policies_controller.rb`
- `app/controllers/concerns/conversation_assignment_targets_concern.rb`
- `enterprise/app/controllers/api/v1/accounts/agent_capacity_policies/inbox_limits_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/agent_capacity_policies/users_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/agent_capacity_policies_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/api/v1/accounts/assignable_agents_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/api/v1/accounts/conversations/assignments_controller.rb` (EE)

### jobs (2)

- `app/jobs/auto_assignment/assignment_job.rb`
- `app/jobs/auto_assignment/periodic_assignment_job.rb`

### lib (1)

- `lib/tasks/assignment_v2_migration.rake`

### models (7)

- `app/models/assignment_policy.rb`
- `app/models/concerns/assignment_handler.rb`
- `app/models/concerns/auto_assignment_handler.rb`
- `app/models/inbox_assignment_policy.rb`
- `enterprise/app/models/agent_capacity_policy.rb` (EE)
- `enterprise/app/models/enterprise/concerns/assignment_policy.rb` (EE)
- `enterprise/app/models/inbox_capacity_limit.rb` (EE)

### policies (2)

- `app/policies/assignment_policy_policy.rb`
- `enterprise/app/policies/agent_capacity_policy_policy.rb` (EE)

### services (10)

- `app/services/auto_assignment/agent_assignment_service.rb`
- `app/services/auto_assignment/assignment_service.rb`
- `app/services/auto_assignment/inbox_round_robin_service.rb`
- `app/services/auto_assignment/rate_limiter.rb`
- `app/services/auto_assignment/round_robin_selector.rb`
- `app/services/conversations/assignment_service.rb`
- `enterprise/app/services/enterprise/auto_assignment/assignment_service.rb` (EE)
- `enterprise/app/services/enterprise/auto_assignment/balanced_selector.rb` (EE)
- `enterprise/app/services/enterprise/auto_assignment/capacity_service.rb` (EE)
- `enterprise/app/services/enterprise/conversations/assignment_service.rb` (EE)

### views (21)

- `app/views/api/v1/accounts/assignable_agents/index.json.jbuilder`
- `app/views/api/v1/accounts/assignment_policies/_assignment_policy.json.jbuilder`
- `app/views/api/v1/accounts/assignment_policies/create.json.jbuilder`
- `app/views/api/v1/accounts/assignment_policies/inboxes/create.json.jbuilder`
- `app/views/api/v1/accounts/assignment_policies/inboxes/index.json.jbuilder`
- `app/views/api/v1/accounts/assignment_policies/index.json.jbuilder`
- `app/views/api/v1/accounts/assignment_policies/show.json.jbuilder`
- `app/views/api/v1/accounts/assignment_policies/update.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/assignable_agents.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/assignment_policies/create.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/assignment_policies/show.json.jbuilder`
- `app/views/mailers/agent_notifications/conversation_notifications_mailer/conversation_assignment.liquid`
- `enterprise/app/views/api/v1/accounts/agent_capacity_policies/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/agent_capacity_policies/inbox_limits/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/agent_capacity_policies/inbox_limits/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/agent_capacity_policies/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/agent_capacity_policies/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/agent_capacity_policies/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/agent_capacity_policies/users/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/agent_capacity_policies/users/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/_agent_capacity_policy.json.jbuilder` (EE)

## Ruby specs (26)

- `spec/controllers/api/v1/accounts/assignable_agents_controller_spec.rb`
- `spec/controllers/api/v1/accounts/assignment_policies/inboxes_controller_spec.rb`
- `spec/controllers/api/v1/accounts/assignment_policies_controller_spec.rb`
- `spec/controllers/api/v1/accounts/conversations/assignments_controller_spec.rb`
- `spec/controllers/api/v1/accounts/inboxes/assignment_policies_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/agent_capacity_policies/inbox_limits_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/agent_capacity_policies/users_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/agent_capacity_policies_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/assignable_agents_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/conversations/assignments_controller_spec.rb`
- `spec/enterprise/models/agent_capacity_policy_spec.rb`
- `spec/enterprise/models/assignment_policy_spec.rb`
- `spec/enterprise/models/inbox_capacity_limit_spec.rb`
- `spec/enterprise/services/enterprise/auto_assignment/assignment_service_spec.rb`
- `spec/enterprise/services/enterprise/auto_assignment/balanced_selector_spec.rb`
- `spec/enterprise/services/enterprise/auto_assignment/capacity_service_spec.rb`
- `spec/jobs/action_cable_handoff_assignment_spec.rb`
- `spec/jobs/auto_assignment/assignment_job_spec.rb`
- `spec/jobs/auto_assignment/periodic_assignment_job_spec.rb`
- `spec/models/assignment_policy_spec.rb`
- `spec/services/auto_assignment/agent_assignment_service_spec.rb`
- `spec/services/auto_assignment/assignment_service_spec.rb`
- `spec/services/auto_assignment/inbox_round_robin_service_spec.rb`
- `spec/services/auto_assignment/rate_limiter_spec.rb`
- `spec/services/auto_assignment/round_robin_selector_spec.rb`
- `spec/services/conversations/assignment_service_spec.rb`

## Frontend files (56)

- `app/javascript/dashboard/api/agentCapacityPolicies.js`
- `app/javascript/dashboard/api/assignableAgents.js`
- `app/javascript/dashboard/api/assignmentPolicies.js`
- `app/javascript/dashboard/api/specs/agentCapacityPolicies.spec.js`
- `app/javascript/dashboard/api/specs/assignableAgents.spec.js`
- `app/javascript/dashboard/api/specs/assignmentPolicies.spec.js`
- `app/javascript/dashboard/components-next/AssignmentPolicy/AgentCapacityPolicyCard/AgentCapacityPolicyCard.spec.js`
- `app/javascript/dashboard/components-next/AssignmentPolicy/AgentCapacityPolicyCard/AgentCapacityPolicyCard.story.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/AgentCapacityPolicyCard/AgentCapacityPolicyCard.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/AssignmentCard/AssignmentCard.story.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/AssignmentCard/AssignmentCard.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/AssignmentPolicyCard/AssignmentPolicyCard.story.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/AssignmentPolicyCard/AssignmentPolicyCard.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/AddDataDropdown.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/BaseInfo.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/CardPopover.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/DataTable.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/ExclusionRules.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/FairDistribution.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/InboxCapacityLimits.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/story/AddDataDropdown.story.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/story/BaseInfo.story.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/story/CardPopover.story.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/story/DataTable.story.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/story/ExclusionRules.story.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/story/FairDistribution.story.vue`
- `app/javascript/dashboard/components-next/AssignmentPolicy/components/story/InboxCapacityLimits.story.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/assignmentPolicy.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/constants.js`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/AgentAssignmentCreatePage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/AgentAssignmentEditPage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/AgentAssignmentIndexPage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/AgentCapacityCreatePage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/AgentCapacityEditPage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/AgentCapacityIndexPage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/components/AgentAssignmentPolicyForm.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/components/AgentCapacityPolicyForm.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/components/ConfirmDeletePolicyDialog.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/components/ConfirmInboxDialog.vue`
- `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/pages/components/InboxLinkDialog.vue`
- `app/javascript/dashboard/store/modules/agentCapacityPolicies.js`
- `app/javascript/dashboard/store/modules/assignmentPolicies.js`
- `app/javascript/dashboard/store/modules/inboxAssignableAgents.js`
- `app/javascript/dashboard/store/modules/specs/agentCapacityPolicies/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/agentCapacityPolicies/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/agentCapacityPolicies/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/agentCapacityPolicies/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/assignmentPolicies/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/assignmentPolicies/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/assignmentPolicies/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/assignmentPolicies/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/inboxAssignableMembers/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/inboxAssignableMembers/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/inboxAssignableMembers/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/inboxAssignableMembers/mutations.spec.js`
