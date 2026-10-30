# LINE

**Area:** Channels

LINE messaging inboxes.

## HTTP routes (1)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/webhooks/line/:line_channel_id(.:format)` | `webhooks/line#process_payload` |

## Database tables (1)

`channel_line`

## Backend files (4)

### controllers (1)

- `app/controllers/webhooks/line_controller.rb`

### models (1)

- `app/models/channel/line.rb`

### services (2)

- `app/services/line/incoming_message_service.rb`
- `app/services/line/send_on_line_service.rb`

## Ruby specs (3)

- `spec/controllers/webhooks/line_controller_spec.rb`
- `spec/services/line/incoming_message_service_spec.rb`
- `spec/services/line/send_on_line_service_spec.rb`

## Frontend files (1)

- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Line.vue`
