# Facebook Messenger

**Area:** Channels

Facebook page inboxes: page linking, Messenger webhooks, sending and message echoes.

**Feature flags:** `channel_facebook`

## HTTP routes (4)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/callbacks/register_facebook_page(.:format)` | `api/v1/accounts/callbacks#register_facebook_page` |
| GET | `/api/v1/accounts/:account_id/callbacks/register_facebook_page(.:format)` | `api/v1/accounts/callbacks#register_facebook_page` |
| POST | `/api/v1/accounts/:account_id/callbacks/facebook_pages(.:format)` | `api/v1/accounts/callbacks#facebook_pages` |
| MOUNT | `/bot` | `Facebook::Messenger::Server` |

## Database tables (1)

`channel_facebook_pages`

## Backend files (15)

### builders (2)

- `app/builders/messages/facebook/message_builder.rb`
- `app/builders/messages/messenger/message_builder.rb`

### controllers (1)

- `app/controllers/concerns/meta_token_verify_concern.rb`

### jobs (2)

- `app/jobs/webhooks/facebook_delivery_job.rb`
- `app/jobs/webhooks/facebook_events_job.rb`

### lib (3)

- `lib/integrations/facebook/delivery_status.rb`
- `lib/integrations/facebook/message_creator.rb`
- `lib/integrations/facebook/message_parser.rb`

### models (1)

- `app/models/channel/facebook_page.rb`

### services (3)

- `app/services/facebook/human_agent_tag_helpers.rb`
- `app/services/facebook/page_details_service.rb`
- `app/services/facebook/send_on_facebook_service.rb`

### views (3)

- `app/views/api/v1/accounts/callbacks/facebook_pages.json.jbuilder`
- `app/views/api/v1/accounts/callbacks/register_facebook_page.json.jbuilder`
- `app/views/mailers/administrator_notifications/channel_notifications_mailer/facebook_disconnect.liquid`

## Ruby specs (7)

- `spec/builders/messages/facebook/message_builder_spec.rb`
- `spec/jobs/webhooks/facebook_delivery_job_spec.rb`
- `spec/jobs/webhooks/facebook_events_job_spec.rb`
- `spec/lib/integrations/facebook/delivery_status_spec.rb`
- `spec/lib/integrations/facebook/message_parser_spec.rb`
- `spec/models/channel/facebook_page_spec.rb`
- `spec/services/facebook/send_on_facebook_service_spec.rb`

## Frontend files (8)

- `app/javascript/dashboard/assets/images/channels/facebook_login.png`
- `app/javascript/dashboard/composables/spec/useFacebookPageConnect.spec.js`
- `app/javascript/dashboard/composables/useFacebookPageConnect.js`
- `app/javascript/dashboard/helper/facebookScopes.js`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/InboxFacebookForm.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/specs/inbox-setup/InboxFacebookForm.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Facebook.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/facebook/Reauthorize.vue`
