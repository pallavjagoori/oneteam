# SLA policies

**Area:** Operations

Service level agreements: policies, applied SLAs, breach events and SLA reports.

**Feature flags:** `sla`

## HTTP routes (9)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/sla_policies(.:format)` | `api/v1/accounts/sla_policies#index` |
| POST | `/api/v1/accounts/:account_id/sla_policies(.:format)` | `api/v1/accounts/sla_policies#create` |
| GET | `/api/v1/accounts/:account_id/sla_policies/:id(.:format)` | `api/v1/accounts/sla_policies#show` |
| PATCH | `/api/v1/accounts/:account_id/sla_policies/:id(.:format)` | `api/v1/accounts/sla_policies#update` |
| PUT | `/api/v1/accounts/:account_id/sla_policies/:id(.:format)` | `api/v1/accounts/sla_policies#update` |
| DELETE | `/api/v1/accounts/:account_id/sla_policies/:id(.:format)` | `api/v1/accounts/sla_policies#destroy` |
| GET | `/api/v1/accounts/:account_id/applied_slas/metrics(.:format)` | `api/v1/accounts/applied_slas#metrics` |
| GET | `/api/v1/accounts/:account_id/applied_slas/download(.:format)` | `api/v1/accounts/applied_slas#download` |
| GET | `/api/v1/accounts/:account_id/applied_slas(.:format)` | `api/v1/accounts/applied_slas#index` |

## Database tables (3)

`applied_slas`, `sla_events`, `sla_policies`

## Backend files (28)

### controllers (2)

- `enterprise/app/controllers/api/v1/accounts/applied_slas_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/sla_policies_controller.rb` (EE)

### drops (1)

- `enterprise/app/drops/sla_policy_drop.rb` (EE)

### jobs (3)

- `enterprise/app/jobs/sla/process_account_applied_slas_job.rb` (EE)
- `enterprise/app/jobs/sla/process_applied_sla_job.rb` (EE)
- `enterprise/app/jobs/sla/trigger_slas_for_accounts_job.rb` (EE)

### lib (1)

- `lib/tasks/apply_sla.rake`

### models (4)

- `app/models/concerns/sla_activity_message_handler.rb`
- `enterprise/app/models/applied_sla.rb` (EE)
- `enterprise/app/models/sla_event.rb` (EE)
- `enterprise/app/models/sla_policy.rb` (EE)

### policies (1)

- `enterprise/app/policies/sla_policy_policy.rb` (EE)

### services (3)

- `enterprise/app/services/sla/backfill_applied_sla_completed_at_service.rb` (EE)
- `enterprise/app/services/sla/business_hours_service.rb` (EE)
- `enterprise/app/services/sla/evaluate_applied_sla_service.rb` (EE)

### views (13)

- `app/views/mailers/agent_notifications/conversation_notifications_mailer/sla_missed_first_response.liquid`
- `app/views/mailers/agent_notifications/conversation_notifications_mailer/sla_missed_next_response.liquid`
- `app/views/mailers/agent_notifications/conversation_notifications_mailer/sla_missed_resolution.liquid`
- `enterprise/app/views/api/v1/accounts/applied_slas/download.csv.erb` (EE)
- `enterprise/app/views/api/v1/accounts/applied_slas/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/applied_slas/metrics.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/sla_policies/create.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/sla_policies/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/sla_policies/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/sla_policies/update.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/_applied_sla.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/_sla_event.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/_sla_policy.json.jbuilder` (EE)

## Ruby specs (12)

- `spec/enterprise/controllers/api/v1/accounts/applied_slas_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/sla_policies_controller_spec.rb`
- `spec/enterprise/drops/sla_policy_drop_spec.rb`
- `spec/enterprise/jobs/sla/process_account_applied_slas_job_spec.rb`
- `spec/enterprise/jobs/sla/process_applied_sla_job_spec.rb`
- `spec/enterprise/jobs/sla/trigger_slas_for_accounts_job_spec.rb`
- `spec/enterprise/models/applied_sla_spec.rb`
- `spec/enterprise/models/sla_event_spec.rb`
- `spec/enterprise/models/sla_policy_spec.rb`
- `spec/enterprise/services/sla/backfill_applied_sla_completed_at_service_spec.rb`
- `spec/enterprise/services/sla/business_hours_service_spec.rb`
- `spec/enterprise/services/sla/evaluate_applied_sla_service_spec.rb`

## Frontend files (22)

- `app/javascript/dashboard/api/sla.js`
- `app/javascript/dashboard/components-next/Conversation/Sla/SLACardLabel.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SLA/SLAFilter.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SLA/SLAMetricCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SLA/SLAMetrics.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SLA/SLAReportFilters.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SLA/SLAReportItem.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SLA/SLATable.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SLA/SLAViewDetails.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/components/SLA/helpers/SLAFilterHelpers.js`
- `app/javascript/dashboard/routes/dashboard/settings/sla/AddSLA.vue`
- `app/javascript/dashboard/routes/dashboard/settings/sla/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/sla/SLAPaywallEnterprise.vue`
- `app/javascript/dashboard/routes/dashboard/settings/sla/SlaForm.vue`
- `app/javascript/dashboard/routes/dashboard/settings/sla/SlaTimeInput.vue`
- `app/javascript/dashboard/routes/dashboard/settings/sla/sla.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/sla/validations.js`
- `app/javascript/dashboard/store/modules/sla.js`
- `app/javascript/dashboard/store/modules/specs/sla/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/sla/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/sla/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/sla/mutations.spec.js`
