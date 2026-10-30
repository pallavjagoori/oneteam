# Email

**Area:** Channels

Email inboxes: forwarding, IMAP polling, SMTP sending, Microsoft and Google OAuth mailboxes, inbound mail processing and email reply threading.

**Feature flags:** `inbound_emails`, `channel_email`, `email_continuity_on_api_channel`, `custom_reply_email`, `branded_email_templates`, `reply_mailer_migration`

## HTTP routes (25)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/app/accounts/:account_id/settings/inboxes/new/microsoft(.:format)` | `dashboard#index` |
| POST | `/api/v1/accounts/:account_id/microsoft/authorization(.:format)` | `api/v1/accounts/microsoft/authorizations#create` |
| POST | `/api/v1/accounts/:account_id/google/authorization(.:format)` | `api/v1/accounts/google/authorizations#create` |
| POST | `/platform/api/v1/accounts/:account_id/email_channel_migrations(.:format)` | `platform/api/v1/email_channel_migrations#create` |
| GET | `/microsoft/callback(.:format)` | `microsoft/callbacks#show` |
| GET | `/google/callback(.:format)` | `google/callbacks#show` |
| GET | `/.well-known/microsoft-identity-association.json(.:format)` | `microsoft#identity_association` |
| GET|POST | `/omniauth/google_oauth2(.:format)` | `devise/omniauth_callbacks#passthru` |
| GET|POST | `/omniauth/google_oauth2/callback(.:format)` | `devise/omniauth_callbacks#google_oauth2` |
| POST | `/rails/action_mailbox/ses/inbound_emails(.:format)` | `action_mailbox/ingresses/ses/inbound_emails#create` |
| POST | `/rails/action_mailbox/postmark/inbound_emails(.:format)` | `action_mailbox/ingresses/postmark/inbound_emails#create` |
| POST | `/rails/action_mailbox/relay/inbound_emails(.:format)` | `action_mailbox/ingresses/relay/inbound_emails#create` |
| POST | `/rails/action_mailbox/sendgrid/inbound_emails(.:format)` | `action_mailbox/ingresses/sendgrid/inbound_emails#create` |
| GET | `/rails/action_mailbox/mandrill/inbound_emails(.:format)` | `action_mailbox/ingresses/mandrill/inbound_emails#health_check` |
| POST | `/rails/action_mailbox/mandrill/inbound_emails(.:format)` | `action_mailbox/ingresses/mandrill/inbound_emails#create` |
| POST | `/rails/action_mailbox/mailgun/inbound_emails/mime(.:format)` | `action_mailbox/ingresses/mailgun/inbound_emails#create` |
| GET | `/rails/conductor/action_mailbox/inbound_emails(.:format)` | `rails/conductor/action_mailbox/inbound_emails#index` |
| POST | `/rails/conductor/action_mailbox/inbound_emails(.:format)` | `rails/conductor/action_mailbox/inbound_emails#create` |
| GET | `/rails/conductor/action_mailbox/inbound_emails/new(.:format)` | `rails/conductor/action_mailbox/inbound_emails#new` |
| GET | `/rails/conductor/action_mailbox/inbound_emails/:id(.:format)` | `rails/conductor/action_mailbox/inbound_emails#show` |
| GET | `/rails/conductor/action_mailbox/inbound_emails/sources/new(.:format)` | `rails/conductor/action_mailbox/inbound_emails/sources#new` |
| POST | `/rails/conductor/action_mailbox/inbound_emails/sources(.:format)` | `rails/conductor/action_mailbox/inbound_emails/sources#create` |
| POST | `/rails/conductor/action_mailbox/:inbound_email_id/reroute(.:format)` | `rails/conductor/action_mailbox/reroutes#create` |
| POST | `/rails/conductor/action_mailbox/:inbound_email_id/incinerate(.:format)` | `rails/conductor/action_mailbox/incinerates#create` |
| MOUNT | `/` | `Aws::ActionMailbox::SES::Engine` |

## Database tables (2)

`action_mailbox_inbound_emails`, `channel_email`

## Backend files (59)

### builders (4)

- `app/builders/email/base_builder.rb`
- `app/builders/email/from_builder.rb`
- `app/builders/email/reply_to_builder.rb`
- `app/builders/email/sender_name_builder.rb`

### controllers (8)

- `app/controllers/api/v1/accounts/google/authorizations_controller.rb`
- `app/controllers/api/v1/accounts/microsoft/authorizations_controller.rb`
- `app/controllers/concerns/google_concern.rb`
- `app/controllers/concerns/microsoft_concern.rb`
- `app/controllers/google/callbacks_controller.rb`
- `app/controllers/microsoft/callbacks_controller.rb`
- `app/controllers/microsoft_controller.rb`
- `app/controllers/platform/api/v1/email_channel_migrations_controller.rb`

### finders (1)

- `app/finders/email_channel_finder.rb`

### helpers (1)

- `app/helpers/email_helper.rb`

### jobs (2)

- `app/jobs/inboxes/fetch_imap_email_inboxes_job.rb`
- `app/jobs/inboxes/fetch_imap_emails_job.rb`

### lib (4)

- `lib/integrations/google_translate/credentials_validator.rb`
- `lib/integrations/google_translate/detect_language_service.rb`
- `lib/integrations/google_translate/processor_service.rb`
- `lib/microsoft_graph_auth.rb`

### mailboxes (8)

- `app/mailboxes/application_mailbox.rb`
- `app/mailboxes/default_mailbox.rb`
- `app/mailboxes/imap/imap_mailbox.rb`
- `app/mailboxes/incoming_email_validity_helper.rb`
- `app/mailboxes/mailbox_helper.rb`
- `app/mailboxes/mailbox_inline_attachment_helper.rb`
- `app/mailboxes/mailbox_sanitizer.rb`
- `app/mailboxes/reply_mailbox.rb`

### mailers (5)

- `app/mailers/conversation_reply_mailer.rb`
- `app/mailers/conversation_reply_mailer_attachment_helper.rb`
- `app/mailers/conversation_reply_mailer_helper.rb`
- `app/mailers/email_delivery_test_mailer.rb`
- `app/mailers/references_header_builder.rb`

### models (2)

- `app/models/channel/email.rb`
- `app/models/concerns/email_address_parseable.rb`

### presenters (2)

- `app/presenters/html_parser.rb`
- `app/presenters/mail_presenter.rb`

### services (16)

- `app/services/email/send_on_email_service.rb`
- `app/services/email/ses_suppression_service.rb`
- `app/services/google/refresh_oauth_token_service.rb`
- `app/services/imap/authentication.rb`
- `app/services/imap/base_fetch_email_service.rb`
- `app/services/imap/deleted_message_tracker.rb`
- `app/services/imap/fetch_email_service.rb`
- `app/services/imap/google_fetch_email_service.rb`
- `app/services/imap/microsoft_fetch_email_service.rb`
- `app/services/mailbox/conversation_finder.rb`
- `app/services/mailbox/conversation_finder_strategies/base_strategy.rb`
- `app/services/mailbox/conversation_finder_strategies/in_reply_to_strategy.rb`
- `app/services/mailbox/conversation_finder_strategies/new_conversation_strategy.rb`
- `app/services/mailbox/conversation_finder_strategies/receiver_uuid_strategy.rb`
- `app/services/mailbox/conversation_finder_strategies/references_strategy.rb`
- `app/services/microsoft/refresh_oauth_token_service.rb`

### views (6)

- `app/views/mailers/conversation_reply_mailer/conversation_transcript.html.erb`
- `app/views/mailers/conversation_reply_mailer/email_reply.html.erb`
- `app/views/mailers/conversation_reply_mailer/reply_with_summary.html.erb`
- `app/views/mailers/conversation_reply_mailer/reply_without_summary.html.erb`
- `app/views/mailers/email_delivery_test_mailer/delivery_test.liquid`
- `app/views/microsoft/identity_association.json.jbuilder`

## Ruby specs (37)

- `spec/builders/email/from_builder_spec.rb`
- `spec/builders/email/reply_to_builder_spec.rb`
- `spec/builders/email/sender_name_builder_spec.rb`
- `spec/controllers/api/v1/accounts/google/authorization_controller_spec.rb`
- `spec/controllers/api/v1/accounts/microsoft/authorization_controller_spec.rb`
- `spec/controllers/google/callbacks_controller_spec.rb`
- `spec/controllers/microsoft/callbacks_controller_spec.rb`
- `spec/controllers/microsoft_controller_spec.rb`
- `spec/controllers/platform/api/v1/email_channel_migrations_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/devise_overrides/google_oauth_attribution_spec.rb`
- `spec/enterprise/jobs/inboxes/fetch_imap_email_inboxes_job_spec.rb`
- `spec/finders/email_channel_finder_spec.rb`
- `spec/helpers/email_helper_spec.rb`
- `spec/jobs/inboxes/fetch_imap_email_inboxes_job_spec.rb`
- `spec/jobs/inboxes/fetch_imap_emails_job_spec.rb`
- `spec/lib/integrations/google_translate/detect_language_service_spec.rb`
- `spec/mailboxes/application_mailbox_spec.rb`
- `spec/mailboxes/imap/imap_mailbox_spec.rb`
- `spec/mailboxes/mailbox_helper_spec.rb`
- `spec/mailboxes/reply_mailbox_spec.rb`
- `spec/mailers/conversation_reply_mailer_spec.rb`
- `spec/mailers/email_delivery_test_mailer_spec.rb`
- `spec/mailers/references_header_builder_spec.rb`
- `spec/models/channel/email_spec.rb`
- `spec/presenters/html_parser_spec.rb`
- `spec/presenters/mail_presenter_spec.rb`
- `spec/services/email/send_on_email_service_spec.rb`
- `spec/services/email/ses_suppression_service_spec.rb`
- `spec/services/google/refresh_oauth_token_service_spec.rb`
- `spec/services/imap/fetch_email_service_spec.rb`
- `spec/services/imap/microsoft_fetch_email_service_spec.rb`
- `spec/services/mailbox/conversation_finder_spec.rb`
- `spec/services/mailbox/conversation_finder_strategies/in_reply_to_strategy_spec.rb`
- `spec/services/mailbox/conversation_finder_strategies/new_conversation_strategy_spec.rb`
- `spec/services/mailbox/conversation_finder_strategies/receiver_uuid_strategy_spec.rb`
- `spec/services/mailbox/conversation_finder_strategies/references_strategy_spec.rb`
- `spec/services/microsoft/refresh_oauth_token_service_spec.rb`

## Frontend files (10)

- `app/javascript/dashboard/api/channel/microsoftClient.js`
- `app/javascript/dashboard/components-next/message/bubbles/Email/EmailMeta.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Email/Index.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Email/specs/Index.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/ImapSettings.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/SmtpSettings.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/emailChannels/Microsoft.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/google/Reauthorize.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/microsoft/Reauthorize.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/specs/ImapSettings.spec.js`
