# Twitter / X

**Area:** Channels

Twitter direct messages and tweets (legacy channel).

## HTTP routes (5)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/app/accounts/:account_id/settings/inboxes/new/twitter(.:format)` | `dashboard#index` |
| POST | `/api/v1/accounts/:account_id/twitter/authorization(.:format)` | `api/v1/accounts/twitter/authorizations#create` |
| GET | `/webhooks/twitter(.:format)` | `api/v1/webhooks#twitter_crc` |
| POST | `/webhooks/twitter(.:format)` | `api/v1/webhooks#twitter_events` |
| GET | `/twitter/callback(.:format)` | `twitter/callbacks#show` |

## Database tables (1)

`channel_twitter_profiles`

## Backend files (11)

### controllers (4)

- `app/controllers/api/v1/accounts/twitter/authorizations_controller.rb`
- `app/controllers/concerns/twitter_concern.rb`
- `app/controllers/twitter/base_controller.rb`
- `app/controllers/twitter/callbacks_controller.rb`

### lib (1)

- `lib/webhooks/twitter.rb`

### models (1)

- `app/models/channel/twitter_profile.rb`

### services (5)

- `app/services/twitter/direct_message_parser_service.rb`
- `app/services/twitter/send_on_twitter_service.rb`
- `app/services/twitter/tweet_parser_service.rb`
- `app/services/twitter/webhook_subscribe_service.rb`
- `app/services/twitter/webhooks_base_service.rb`

## Ruby specs (5)

- `spec/controllers/api/v1/accounts/twitter/authorizations_controller_spec.rb`
- `spec/controllers/twitter/callbacks_controller_spec.rb`
- `spec/lib/webhooks/twitter_spec.rb`
- `spec/services/twitter/send_on_twitter_service_spec.rb`
- `spec/services/twitter/webhook_subscribe_service_spec.rb`

## Frontend files (3)

- `app/javascript/dashboard/api/channel/twitterClient.js`
- `app/javascript/dashboard/api/specs/channel/twitterClient.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Twitter.vue`
