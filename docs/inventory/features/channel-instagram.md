# Instagram

**Area:** Channels

Instagram direct messages through the Instagram API and through linked Facebook pages.

**Feature flags:** `channel_instagram`

## HTTP routes (5)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/app/accounts/:account_id/settings/inboxes/new/instagram(.:format)` | `dashboard#index` |
| POST | `/api/v1/accounts/:account_id/instagram/authorization(.:format)` | `api/v1/accounts/instagram/authorizations#create` |
| GET | `/webhooks/instagram(.:format)` | `webhooks/instagram#verify` |
| POST | `/webhooks/instagram(.:format)` | `webhooks/instagram#events` |
| GET | `/instagram/callback(.:format)` | `instagram/callbacks#show` |

## Database tables (1)

`channel_instagram`

## Backend files (23)

### builders (3)

- `app/builders/messages/instagram/base_message_builder.rb`
- `app/builders/messages/instagram/message_builder.rb`
- `app/builders/messages/instagram/messenger/message_builder.rb`

### controllers (4)

- `app/controllers/api/v1/accounts/instagram/authorizations_controller.rb`
- `app/controllers/concerns/instagram_concern.rb`
- `app/controllers/instagram/callbacks_controller.rb`
- `app/controllers/webhooks/instagram_controller.rb`

### helpers (1)

- `app/helpers/instagram/integration_helper.rb`

### jobs (1)

- `app/jobs/webhooks/instagram_events_job.rb`

### models (1)

- `app/models/channel/instagram.rb`

### services (12)

- `app/services/instagram/base_message_text.rb`
- `app/services/instagram/base_send_service.rb`
- `app/services/instagram/message_text.rb`
- `app/services/instagram/messenger/message_text.rb`
- `app/services/instagram/messenger/send_on_instagram_service.rb`
- `app/services/instagram/read_status_service.rb`
- `app/services/instagram/refresh_oauth_token_service.rb`
- `app/services/instagram/send_on_instagram_service.rb`
- `app/services/instagram/test_event_service.rb`
- `app/services/instagram/user_details_service.rb`
- `app/services/instagram/webhooks_base_service.rb`
- `app/services/messages/markdown_renderers/instagram_renderer.rb`

### views (1)

- `app/views/mailers/administrator_notifications/channel_notifications_mailer/instagram_disconnect.liquid`

## Ruby specs (14)

- `spec/builders/messages/instagram/message_builder_spec.rb`
- `spec/builders/messages/instagram/messenger/message_builder_spec.rb`
- `spec/controllers/api/v1/accounts/instagram/authorizations_controller_spec.rb`
- `spec/controllers/concerns/instagram_concern_spec.rb`
- `spec/controllers/instagram/callbacks_controller_spec.rb`
- `spec/controllers/webhooks/instagram_controller_spec.rb`
- `spec/helpers/instagram/integration_helper_spec.rb`
- `spec/jobs/webhooks/instagram_events_job_spec.rb`
- `spec/models/channel/instagram_spec.rb`
- `spec/services/instagram/messenger/send_on_instagram_service_spec.rb`
- `spec/services/instagram/read_status_service_spec.rb`
- `spec/services/instagram/refresh_oauth_token_service_spec.rb`
- `spec/services/instagram/send_on_instagram_service_spec.rb`
- `spec/services/instagram/test_event_service_spec.rb`

## Frontend files (8)

- `app/javascript/dashboard/api/channel/instagramClient.js`
- `app/javascript/dashboard/components-next/message/bubbles/InstagramStory.vue`
- `app/javascript/dashboard/components-next/message/fixtures/instagramConversation.js`
- `app/javascript/dashboard/components-next/message/stories/InstagramBubbles.story.vue`
- `app/javascript/dashboard/components-next/message/stories/InstagramMessages.story.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Instagram.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/instagram/DuplicateInboxBanner.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/instagram/Reauthorize.vue`
