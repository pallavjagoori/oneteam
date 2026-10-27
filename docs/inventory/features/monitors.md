# Conversation monitors

**Area:** Operations

Scheduled monitors that watch conversations and trigger actions.

**Feature flags:** `conversation_monitors`

## HTTP routes (12)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/monitors/preview(.:format)` | `api/v1/accounts/monitors#preview` |
| GET | `/api/v1/accounts/:account_id/monitors/preview/:token(.:format)` | `api/v1/accounts/monitors#preview_status` |
| GET | `/api/v1/accounts/:account_id/monitors/:id/timeseries(.:format)` | `api/v1/accounts/monitors#timeseries` |
| GET | `/api/v1/accounts/:account_id/monitors/:id/conversations(.:format)` | `api/v1/accounts/monitors#conversations` |
| POST | `/api/v1/accounts/:account_id/monitors/:id/retry_evaluations(.:format)` | `api/v1/accounts/monitors#retry_evaluations` |
| POST | `/api/v1/accounts/:account_id/monitors/:id/resume(.:format)` | `api/v1/accounts/monitors#resume` |
| GET | `/api/v1/accounts/:account_id/monitors(.:format)` | `api/v1/accounts/monitors#index` |
| POST | `/api/v1/accounts/:account_id/monitors(.:format)` | `api/v1/accounts/monitors#create` |
| GET | `/api/v1/accounts/:account_id/monitors/:id(.:format)` | `api/v1/accounts/monitors#show` |
| PATCH | `/api/v1/accounts/:account_id/monitors/:id(.:format)` | `api/v1/accounts/monitors#update` |
| PUT | `/api/v1/accounts/:account_id/monitors/:id(.:format)` | `api/v1/accounts/monitors#update` |
| DELETE | `/api/v1/accounts/:account_id/monitors/:id(.:format)` | `api/v1/accounts/monitors#destroy` |

## Database tables (5)

`conversation_monitor_daily_usages`, `conversation_monitor_evaluations`, `conversation_monitor_scans`, `conversation_monitor_work_items`, `conversation_monitors`

## Backend files (31)

### controllers (1)

- `enterprise/app/controllers/api/v1/accounts/monitors_controller.rb` (EE)

### jobs (7)

- `app/jobs/internal/dispatch_conversation_monitors_job.rb`
- `enterprise/app/jobs/conversation_monitors/broadcast_job.rb` (EE)
- `enterprise/app/jobs/conversation_monitors/dispatch_job.rb` (EE)
- `enterprise/app/jobs/conversation_monitors/preview_job.rb` (EE)
- `enterprise/app/jobs/conversation_monitors/process_job.rb` (EE)
- `enterprise/app/jobs/conversation_monitors/retry_job.rb` (EE)
- `enterprise/app/jobs/conversation_monitors/scan_job.rb` (EE)

### lib (2)

- `enterprise/lib/custom_exceptions/monitor_evaluation_error.rb` (EE)
- `enterprise/lib/custom_exceptions/monitor_parameters_error.rb` (EE)

### models (8)

- `enterprise/app/models/conversation_monitors/attachment_tracking.rb` (EE)
- `enterprise/app/models/conversation_monitors/conversation_tracking.rb` (EE)
- `enterprise/app/models/conversation_monitors/daily_usage.rb` (EE)
- `enterprise/app/models/conversation_monitors/evaluation.rb` (EE)
- `enterprise/app/models/conversation_monitors/message_tracking.rb` (EE)
- `enterprise/app/models/conversation_monitors/monitor.rb` (EE)
- `enterprise/app/models/conversation_monitors/scan.rb` (EE)
- `enterprise/app/models/conversation_monitors/work_item.rb` (EE)

### services (12)

- `enterprise/app/services/conversation_monitors/buckets.rb` (EE)
- `enterprise/app/services/conversation_monitors/configuration.rb` (EE)
- `enterprise/app/services/conversation_monitors/context_builder.rb` (EE)
- `enterprise/app/services/conversation_monitors/decision_service.rb` (EE)
- `enterprise/app/services/conversation_monitors/evaluator.rb` (EE)
- `enterprise/app/services/conversation_monitors/presenter.rb` (EE)
- `enterprise/app/services/conversation_monitors/report.rb` (EE)
- `enterprise/app/services/conversation_monitors/result_writer.rb` (EE)
- `enterprise/app/services/conversation_monitors/resume.rb` (EE)
- `enterprise/app/services/conversation_monitors/scheduler.rb` (EE)
- `enterprise/app/services/conversation_monitors/update.rb` (EE)
- `enterprise/app/services/conversation_monitors/usage.rb` (EE)

### views (1)

- `app/views/icons/_monitor.html.erb`

## Ruby specs (16)

- `spec/enterprise/controllers/api/v1/accounts/monitors_controller_spec.rb`
- `spec/enterprise/jobs/conversation_monitors/broadcast_job_spec.rb`
- `spec/enterprise/jobs/conversation_monitors/retry_job_spec.rb`
- `spec/enterprise/jobs/conversation_monitors/scan_job_spec.rb`
- `spec/enterprise/models/conversation_monitors/attachment_tracking_spec.rb`
- `spec/enterprise/models/conversation_monitors/message_tracking_cleanup_spec.rb`
- `spec/enterprise/models/conversation_monitors/message_tracking_spec.rb`
- `spec/enterprise/services/conversation_monitors/buckets_spec.rb`
- `spec/enterprise/services/conversation_monitors/context_builder_spec.rb`
- `spec/enterprise/services/conversation_monitors/decision_service_spec.rb`
- `spec/enterprise/services/conversation_monitors/evaluator_spec.rb`
- `spec/enterprise/services/conversation_monitors/presenter_spec.rb`
- `spec/enterprise/services/conversation_monitors/report_spec.rb`
- `spec/enterprise/services/conversation_monitors/resume_spec.rb`
- `spec/enterprise/services/conversation_monitors/update_spec.rb`
- `spec/enterprise/services/conversation_monitors/usage_spec.rb`

## Frontend files (21)

- `app/javascript/dashboard/api/monitors.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorActionDialog.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorChartFilters.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorDrilldown.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorForm.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorIconPicker.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorListItem.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorShow.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorTemplateCard.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorUsageWarning.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/MonitorsIndex.vue`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/constants.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/monitorTemplates.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/specs/MonitorChartFilters.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/specs/MonitorErrorTranslations.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/specs/MonitorForm.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/specs/MonitorListItem.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/specs/MonitorShow.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/specs/MonitorUsageWarning.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/specs/useMonitorRefresh.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/reports/monitors/useMonitorRefresh.js`
