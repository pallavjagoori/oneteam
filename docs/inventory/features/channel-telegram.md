# Telegram

**Area:** Channels

Telegram bot inboxes.

## HTTP routes (1)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/webhooks/telegram/:bot_token(.:format)` | `webhooks/telegram#process_payload` |

## Database tables (1)

`channel_telegram`

## Backend files (10)

### controllers (1)

- `app/controllers/webhooks/telegram_controller.rb`

### jobs (1)

- `app/jobs/webhooks/telegram_events_job.rb`

### models (1)

- `app/models/channel/telegram.rb`

### services (7)

- `app/services/messages/markdown_renderers/telegram_renderer.rb`
- `app/services/telegram/callback_query_param_helpers.rb`
- `app/services/telegram/incoming_message_service.rb`
- `app/services/telegram/param_helpers.rb`
- `app/services/telegram/send_attachments_service.rb`
- `app/services/telegram/send_on_telegram_service.rb`
- `app/services/telegram/update_message_service.rb`

## Ruby specs (7)

- `spec/controllers/webhooks/telegram_controller_spec.rb`
- `spec/jobs/webhooks/telegram_events_job_spec.rb`
- `spec/models/channel/telegram_spec.rb`
- `spec/services/telegram/incoming_message_service_spec.rb`
- `spec/services/telegram/send_attachments_service_spec.rb`
- `spec/services/telegram/send_on_telegram_service_spec.rb`
- `spec/services/telegram/update_message_service_spec.rb`

## Frontend files (1)

- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Telegram.vue`
