# Audit logs

**Area:** Security

Audit trail of account changes (enterprise).

**Feature flags:** `audit_logs`, `audit_log_ip_address`

## HTTP routes (1)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/audit_logs(.:format)` | `api/v1/accounts/audit_logs#show` |

## Database tables (1)

`audits`

## Backend files (17)

### controllers (1)

- `enterprise/app/controllers/api/v1/accounts/audit_logs_controller.rb` (EE)

### jobs (3)

- `enterprise/app/jobs/enterprise/audit_log_ip_location_backfill_job.rb` (EE)
- `enterprise/app/jobs/enterprise/audit_log_ip_lookup_job.rb` (EE)
- `enterprise/app/jobs/enterprise/audit_log_session_ip_lookup_job.rb` (EE)

### lib (1)

- `enterprise/lib/tasks/audit_log.rake` (EE)

### models (11)

- `enterprise/app/models/enterprise/audit/account.rb` (EE)
- `enterprise/app/models/enterprise/audit/account_user.rb` (EE)
- `enterprise/app/models/enterprise/audit/agent_bot.rb` (EE)
- `enterprise/app/models/enterprise/audit/conversation.rb` (EE)
- `enterprise/app/models/enterprise/audit/inbox.rb` (EE)
- `enterprise/app/models/enterprise/audit/inbox_member.rb` (EE)
- `enterprise/app/models/enterprise/audit/team.rb` (EE)
- `enterprise/app/models/enterprise/audit/team_member.rb` (EE)
- `enterprise/app/models/enterprise/audit/user.rb` (EE)
- `enterprise/app/models/enterprise/audit/webhook.rb` (EE)
- `enterprise/app/models/enterprise/audit_log.rb` (EE)

### views (1)

- `enterprise/app/views/api/v1/accounts/audit_logs/show.json.jbuilder` (EE)

## Ruby specs (6)

- `spec/enterprise/controllers/api/v1/accounts/audit_logs_controller_spec.rb`
- `spec/enterprise/jobs/enterprise/audit_log_ip_location_backfill_job_spec.rb`
- `spec/enterprise/jobs/enterprise/audit_log_ip_lookup_job_spec.rb`
- `spec/enterprise/jobs/enterprise/audit_log_session_ip_lookup_job_spec.rb`
- `spec/enterprise/models/enterprise/audit_log_spec.rb`
- `spec/models/enterprise/audit/conversation_spec.rb`

## Frontend files (8)

- `app/javascript/dashboard/api/auditLogs.js`
- `app/javascript/dashboard/api/specs/auditLogs.spec.js`
- `app/javascript/dashboard/helper/auditlogHelper.js`
- `app/javascript/dashboard/helper/specs/auditlogHelper.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/auditlogs/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/auditlogs/audit.routes.js`
- `app/javascript/dashboard/store/modules/auditlogs.js`
- `app/javascript/dashboard/store/modules/specs/auditlogs/actions.spec.js`
