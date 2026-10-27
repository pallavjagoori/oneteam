# Data import from other help desks

**Area:** CRM

Importing contacts and conversation history from Intercom, Freshdesk and CSV files, with mappings, progress and error logs.

**Feature flags:** `data_import`

## HTTP routes (9)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/data_imports/validate_source(.:format)` | `api/v1/accounts/data_imports#validate_source` |
| POST | `/api/v1/accounts/:account_id/data_imports/:id/start(.:format)` | `api/v1/accounts/data_imports#start` |
| POST | `/api/v1/accounts/:account_id/data_imports/:id/retry(.:format)` | `api/v1/accounts/data_imports#retry_import` |
| POST | `/api/v1/accounts/:account_id/data_imports/:id/abandon(.:format)` | `api/v1/accounts/data_imports#abandon` |
| GET | `/api/v1/accounts/:account_id/data_imports/:id/error_logs(.:format)` | `api/v1/accounts/data_imports#error_logs` |
| GET | `/api/v1/accounts/:account_id/data_imports/:id/skip_logs(.:format)` | `api/v1/accounts/data_imports#skip_logs` |
| GET | `/api/v1/accounts/:account_id/data_imports(.:format)` | `api/v1/accounts/data_imports#index` |
| POST | `/api/v1/accounts/:account_id/data_imports(.:format)` | `api/v1/accounts/data_imports#create` |
| GET | `/api/v1/accounts/:account_id/data_imports/:id(.:format)` | `api/v1/accounts/data_imports#show` |

## Database tables (4)

`data_import_errors`, `data_import_items`, `data_import_mappings`, `data_imports`

## Backend files (55)

### controllers (1)

- `app/controllers/api/v1/accounts/data_imports_controller.rb`

### finders (2)

- `app/finders/data_import_error_finder.rb`
- `app/finders/data_import_skip_log_finder.rb`

### jobs (13)

- `app/jobs/data_import_job.rb`
- `app/jobs/data_imports/base_job.rb`
- `app/jobs/data_imports/contacts_page_job.rb`
- `app/jobs/data_imports/conversations_page_job.rb`
- `app/jobs/data_imports/freshdesk/base_job.rb`
- `app/jobs/data_imports/freshdesk/contacts_page_job.rb`
- `app/jobs/data_imports/freshdesk/conversations_page_job.rb`
- `app/jobs/data_imports/freshdesk/import_job.rb`
- `app/jobs/data_imports/import_job.rb`
- `app/jobs/data_imports/intercom/base_job.rb`
- `app/jobs/data_imports/intercom/contacts_page_job.rb`
- `app/jobs/data_imports/intercom/conversations_page_job.rb`
- `app/jobs/data_imports/intercom/import_job.rb`

### lib (1)

- `lib/custom_exceptions/data_import/freshdesk_ticket_limit_error.rb`

### models (4)

- `app/models/data_import.rb`
- `app/models/data_import_error.rb`
- `app/models/data_import_item.rb`
- `app/models/data_import_mapping.rb`

### policies (1)

- `app/policies/data_import_policy.rb`

### services (30)

- `app/services/data_import/contact_manager.rb`
- `app/services/data_imports/creation_service.rb`
- `app/services/data_imports/freshdesk/client.rb`
- `app/services/data_imports/freshdesk/credentials_validator.rb`
- `app/services/data_imports/freshdesk/importer.rb`
- `app/services/data_imports/freshdesk/message_batch_builder.rb`
- `app/services/data_imports/freshdesk/metadata.rb`
- `app/services/data_imports/freshdesk/normalizer.rb`
- `app/services/data_imports/freshdesk/placeholder_inbox_builder.rb`
- `app/services/data_imports/freshdesk/source.rb`
- `app/services/data_imports/freshdesk/source_bucket.rb`
- `app/services/data_imports/freshdesk/ticket_page.rb`
- `app/services/data_imports/importer.rb`
- `app/services/data_imports/intercom/activity_content_builder.rb`
- `app/services/data_imports/intercom/client.rb`
- `app/services/data_imports/intercom/creation_service.rb`
- `app/services/data_imports/intercom/credentials_validator.rb`
- `app/services/data_imports/intercom/importer.rb`
- `app/services/data_imports/intercom/message_batch_builder.rb`
- `app/services/data_imports/intercom/placeholder_inbox_builder.rb`
- `app/services/data_imports/intercom/restart_service.rb`
- `app/services/data_imports/intercom/retry_service.rb`
- `app/services/data_imports/intercom/source.rb`
- `app/services/data_imports/intercom/source_bucket.rb`
- `app/services/data_imports/message_batch_builder.rb`
- `app/services/data_imports/placeholder_inbox_builder.rb`
- `app/services/data_imports/restart_service.rb`
- `app/services/data_imports/retry_service.rb`
- `app/services/data_imports/source.rb`
- `enterprise/app/services/enterprise/data_imports/importer.rb` (EE)

### views (3)

- `app/views/api/v1/accounts/data_imports/_data_import.json.jbuilder`
- `app/views/api/v1/accounts/data_imports/index.json.jbuilder`
- `app/views/api/v1/accounts/data_imports/show.json.jbuilder`

## Ruby specs (25)

- `spec/enterprise/services/data_imports/importer_spec.rb`
- `spec/finders/data_import_error_finder_spec.rb`
- `spec/finders/data_import_skip_log_finder_spec.rb`
- `spec/jobs/data_import_job_spec.rb`
- `spec/jobs/data_imports/freshdesk/import_jobs_spec.rb`
- `spec/jobs/data_imports/intercom/import_jobs_spec.rb`
- `spec/models/data_import_spec.rb`
- `spec/requests/api/v1/accounts/data_imports_spec.rb`
- `spec/services/data_imports/freshdesk/client_spec.rb`
- `spec/services/data_imports/freshdesk/credentials_validator_spec.rb`
- `spec/services/data_imports/freshdesk/importer_spec.rb`
- `spec/services/data_imports/freshdesk/normalizer_spec.rb`
- `spec/services/data_imports/freshdesk/source_bucket_spec.rb`
- `spec/services/data_imports/freshdesk/source_spec.rb`
- `spec/services/data_imports/intercom/activity_content_builder_spec.rb`
- `spec/services/data_imports/intercom/client_spec.rb`
- `spec/services/data_imports/intercom/creation_service_spec.rb`
- `spec/services/data_imports/intercom/credentials_validator_spec.rb`
- `spec/services/data_imports/intercom/importer_spec.rb`
- `spec/services/data_imports/intercom/message_batch_builder_spec.rb`
- `spec/services/data_imports/intercom/placeholder_inbox_builder_spec.rb`
- `spec/services/data_imports/intercom/restart_service_spec.rb`
- `spec/services/data_imports/intercom/retry_service_spec.rb`
- `spec/services/data_imports/intercom/source_bucket_spec.rb`
- `spec/services/data_imports/source_spec.rb`

## Frontend files (0)

