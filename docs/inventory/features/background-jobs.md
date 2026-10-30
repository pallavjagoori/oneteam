# Scheduled and maintenance jobs

**Area:** Platform internals

Cron jobs and internal maintenance jobs: cleanups, scheduled triggers and data migrations.

## HTTP routes (1)

| Verb | Path | Controller#action |
| --- | --- | --- |
| MOUNT | `/monitoring/sidekiq` | `Sidekiq::Web` |

## Database tables (0)

None.

## Backend files (25)

### jobs (12)

- `app/jobs/application_job.rb`
- `app/jobs/delete_object_job.rb`
- `app/jobs/internal/process_stale_redis_keys_job.rb`
- `app/jobs/internal/remove_stale_redis_keys_job.rb`
- `app/jobs/internal/trigger_daily_scheduled_items_job.rb`
- `app/jobs/internal/trigger_hourly_scheduled_items_job.rb`
- `app/jobs/mutex_application_job.rb`
- `app/jobs/trigger_scheduled_items_job.rb`
- `enterprise/app/jobs/enterprise/delete_object_job.rb` (EE)
- `enterprise/app/jobs/enterprise/internal/trigger_daily_scheduled_items_job.rb` (EE)
- `enterprise/app/jobs/enterprise/internal/trigger_hourly_scheduled_items_job.rb` (EE)
- `enterprise/app/jobs/enterprise/trigger_scheduled_items_job.rb` (EE)

### lib (12)

- `lib/tasks/.keep`
- `lib/tasks/annotate_rb.rake`
- `lib/tasks/asset_clean.rake`
- `lib/tasks/build.rake`
- `lib/tasks/db_enhancements.rake`
- `lib/tasks/dev/variant_toggle.rake`
- `lib/tasks/feature_defaults.rake`
- `lib/tasks/instance_id.rake`
- `lib/tasks/ip_lookup.rake`
- `lib/tasks/sidekiq_tasks.rake`
- `lib/tasks/storage_migrations.rake`
- `lib/tasks/swagger.rake`

### services (1)

- `app/services/internal/remove_stale_redis_keys_service.rb`

## Ruby specs (14)

- `spec/configs/schedule_spec.rb`
- `spec/enterprise/jobs/enterprise/delete_object_job_spec.rb`
- `spec/enterprise/jobs/enterprise/internal/trigger_daily_scheduled_items_job_spec.rb`
- `spec/enterprise/jobs/enterprise/internal/trigger_hourly_scheduled_items_job_spec.rb`
- `spec/enterprise/jobs/enterprise/trigger_scheduled_items_job_spec.rb`
- `spec/jobs/delete_object_job_spec.rb`
- `spec/jobs/internal/process_stale_redis_keys_job_spec.rb`
- `spec/jobs/internal/remove_stale_redis_keys_job_spec.rb`
- `spec/jobs/internal/trigger_daily_scheduled_items_job_spec.rb`
- `spec/jobs/internal/trigger_hourly_scheduled_items_job_spec.rb`
- `spec/jobs/mutex_application_job_spec.rb`
- `spec/jobs/trigger_scheduled_items_job_spec.rb`
- `spec/lib/tasks/rake/task_storage_migrations_spec.rb`
- `spec/services/internal/remove_stale_redis_keys_service_spec.rb`

## Frontend files (0)

