# TikTok

**Area:** Channels

TikTok business messaging inboxes.

**Feature flags:** `channel_tiktok`

## HTTP routes (4)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/app/accounts/:account_id/settings/inboxes/new/tiktok(.:format)` | `dashboard#index` |
| POST | `/api/v1/accounts/:account_id/tiktok/authorization(.:format)` | `api/v1/accounts/tiktok/authorizations#create` |
| POST | `/webhooks/tiktok(.:format)` | `webhooks/tiktok#events` |
| GET | `/tiktok/callback(.:format)` | `tiktok/callbacks#show` |

## Database tables (1)

`channel_tiktok`

## Backend files (13)

### controllers (3)

- `app/controllers/api/v1/accounts/tiktok/authorizations_controller.rb`
- `app/controllers/tiktok/callbacks_controller.rb`
- `app/controllers/webhooks/tiktok_controller.rb`

### helpers (1)

- `app/helpers/tiktok/integration_helper.rb`

### jobs (1)

- `app/jobs/webhooks/tiktok_events_job.rb`

### models (1)

- `app/models/channel/tiktok.rb`

### services (7)

- `app/services/tiktok/auth_client.rb`
- `app/services/tiktok/client.rb`
- `app/services/tiktok/message_service.rb`
- `app/services/tiktok/messaging_helpers.rb`
- `app/services/tiktok/read_status_service.rb`
- `app/services/tiktok/send_on_tiktok_service.rb`
- `app/services/tiktok/token_service.rb`

## Ruby specs (9)

- `spec/controllers/api/v1/accounts/tiktok/authorizations_controller_spec.rb`
- `spec/controllers/tiktok/callbacks_controller_spec.rb`
- `spec/controllers/webhooks/tiktok_controller_spec.rb`
- `spec/jobs/webhooks/tiktok_events_job_spec.rb`
- `spec/services/tiktok/client_spec.rb`
- `spec/services/tiktok/message_service_spec.rb`
- `spec/services/tiktok/read_status_service_spec.rb`
- `spec/services/tiktok/send_on_tiktok_service_spec.rb`
- `spec/services/tiktok/token_service_spec.rb`

## Frontend files (4)

- `app/javascript/dashboard/api/channel/tiktokClient.js`
- `app/javascript/dashboard/api/specs/tiktokClient.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Tiktok.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/tiktok/Reauthorize.vue`
