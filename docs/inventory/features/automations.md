# Automation rules

**Area:** Operations

Event-driven automation rules with conditions and actions.

**Feature flags:** `automations`, `delayed_automations`

## HTTP routes (7)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/automation_rules/:automation_rule_id/clone(.:format)` | `api/v1/accounts/automation_rules#clone` |
| GET | `/api/v1/accounts/:account_id/automation_rules(.:format)` | `api/v1/accounts/automation_rules#index` |
| POST | `/api/v1/accounts/:account_id/automation_rules(.:format)` | `api/v1/accounts/automation_rules#create` |
| GET | `/api/v1/accounts/:account_id/automation_rules/:id(.:format)` | `api/v1/accounts/automation_rules#show` |
| PATCH | `/api/v1/accounts/:account_id/automation_rules/:id(.:format)` | `api/v1/accounts/automation_rules#update` |
| PUT | `/api/v1/accounts/:account_id/automation_rules/:id(.:format)` | `api/v1/accounts/automation_rules#update` |
| DELETE | `/api/v1/accounts/:account_id/automation_rules/:id(.:format)` | `api/v1/accounts/automation_rules#destroy` |

## Database tables (3)

`automation_rule_pending_executions`, `automation_rules`, `conversation_monitor_automation_deliveries`

## Backend files (26)

### controllers (2)

- `app/controllers/api/v1/accounts/automation_rules_controller.rb`
- `enterprise/app/controllers/enterprise/api/v1/accounts/automation_rules_controller.rb` (EE)

### jobs (3)

- `app/jobs/automation_rules/process_pending_execution_job.rb`
- `app/jobs/automation_rules/trigger_pending_executions_job.rb`
- `enterprise/app/jobs/conversation_monitors/process_automation_delivery_job.rb` (EE)

### listeners (1)

- `app/listeners/automation_rule_listener.rb`

### mailers (1)

- `app/mailers/team_notifications/automation_notification_mailer.rb`

### models (5)

- `app/models/automation_rule.rb`
- `app/models/automation_rule_pending_execution.rb`
- `enterprise/app/models/conversation_monitors/automation_delivery.rb` (EE)
- `enterprise/app/models/enterprise/audit/automation_rule.rb` (EE)
- `enterprise/app/models/enterprise/automation_rule.rb` (EE)

### policies (1)

- `app/policies/automation_rule_policy.rb`

### services (3)

- `app/services/automation_rules/action_service.rb`
- `app/services/automation_rules/condition_validation_service.rb`
- `app/services/automation_rules/conditions_filter_service.rb`

### views (10)

- `app/views/api/v1/accounts/automation_rules/clone.json.jbuilder`
- `app/views/api/v1/accounts/automation_rules/create.json.jbuilder`
- `app/views/api/v1/accounts/automation_rules/index.json.jbuilder`
- `app/views/api/v1/accounts/automation_rules/partials/_automation_rule.json.jbuilder`
- `app/views/api/v1/accounts/automation_rules/show.json.jbuilder`
- `app/views/api/v1/accounts/automation_rules/update.json.jbuilder`
- `app/views/mailers/administrator_notifications/account_notification_mailer/automation_rule_disabled.liquid`
- `app/views/mailers/team_notifications/automation_notification_mailer/conversation_creation.liquid`
- `app/views/mailers/team_notifications/automation_notification_mailer/conversation_updated.liquid`
- `app/views/mailers/team_notifications/automation_notification_mailer/message_created.liquid`

## Ruby specs (15)

- `spec/controllers/api/v1/accounts/automation_rules_controller_spec.rb`
- `spec/enterprise/jobs/conversation_monitors/process_automation_delivery_job_spec.rb`
- `spec/enterprise/models/automation_rule_spec.rb`
- `spec/enterprise/requests/monitor_automation_rules_spec.rb`
- `spec/enterprise/services/conversation_monitors/result_writer_automation_spec.rb`
- `spec/jobs/automation_rules/process_pending_execution_job_spec.rb`
- `spec/jobs/automation_rules/trigger_pending_executions_job_spec.rb`
- `spec/listeners/automation_rule_listener_labels_spec.rb`
- `spec/listeners/automation_rule_listener_old_spec.rb`
- `spec/listeners/automation_rule_listener_spec.rb`
- `spec/models/automation_rule_pending_execution_spec.rb`
- `spec/models/automation_rule_spec.rb`
- `spec/services/automation_rules/action_service_spec.rb`
- `spec/services/automation_rules/condition_validation_service_spec.rb`
- `spec/services/automation_rules/conditions_filter_service_spec.rb`

## Frontend files (32)

- `app/javascript/dashboard/api/automation.js`
- `app/javascript/dashboard/api/specs/automation.spec.js`
- `app/javascript/dashboard/composables/spec/useAutomation.spec.js`
- `app/javascript/dashboard/composables/spec/useEditableAutomation.spec.js`
- `app/javascript/dashboard/composables/useAutomation.js`
- `app/javascript/dashboard/composables/useAutomationValues.js`
- `app/javascript/dashboard/composables/useEditableAutomation.js`
- `app/javascript/dashboard/constants/automation.js`
- `app/javascript/dashboard/helper/automationHelper.js`
- `app/javascript/dashboard/helper/specs/automationHelper.spec.js`
- `app/javascript/dashboard/helper/specs/fixtures/automationFixtures.js`
- `app/javascript/dashboard/routes/dashboard/settings/automation/AddAutomationRule.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/AutomationRuleForm.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/automation/AutomationRuleForm.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/AutomationRuleRow.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/EditAutomationRule.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/automation.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/automation/components/AutomationActions.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/components/AutomationInstantTrigger.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/automation/components/AutomationInstantTrigger.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/components/AutomationMonitorSelect.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/components/AutomationRunTypeSelector.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/components/AutomationWaitCondition.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/automation/components/AutomationWaitCondition.vue`
- `app/javascript/dashboard/routes/dashboard/settings/automation/constants.js`
- `app/javascript/dashboard/routes/dashboard/settings/automation/operators.js`
- `app/javascript/dashboard/store/modules/automations.js`
- `app/javascript/dashboard/store/modules/specs/automations/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/automations/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/automations/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/automations/mutations.spec.js`
