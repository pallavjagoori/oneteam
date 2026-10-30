# Inboxes

**Area:** Conversations

Inbox setup and settings shared by every channel: members, business hours, working hours, channel base classes and inbox management.

**Feature flags:** `inbox_management`

## HTTP routes (18)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/app/accounts/:account_id/settings/inboxes/:inbox_id(.:format)` | `dashboard#index` |
| GET | `/app/accounts/:account_id/settings/inboxes/:inbox_id(.:format)` | `dashboard#index` |
| GET | `/app/accounts/:account_id/settings/inboxes/:inbox_id(.:format)` | `dashboard#index` |
| POST | `/api/v1/accounts/:account_id/inboxes/:id/sync_templates(.:format)` | `api/v1/accounts/inboxes#sync_templates` |
| GET | `/api/v1/accounts/:account_id/inboxes/:id/health(.:format)` | `api/v1/accounts/inboxes#health` |
| POST | `/api/v1/accounts/:account_id/inboxes/:id/reset_secret(.:format)` | `api/v1/accounts/inboxes#reset_secret` |
| POST | `/api/v1/accounts/:account_id/inboxes/:id/rotate_hmac_token(.:format)` | `api/v1/accounts/inboxes#rotate_hmac_token` |
| POST | `/api/v1/accounts/:account_id/inboxes/:id/set_inbound_calls(.:format)` | `api/v1/accounts/inboxes#set_inbound_calls` |
| GET | `/api/v1/accounts/:account_id/inboxes(.:format)` | `api/v1/accounts/inboxes#index` |
| POST | `/api/v1/accounts/:account_id/inboxes(.:format)` | `api/v1/accounts/inboxes#create` |
| GET | `/api/v1/accounts/:account_id/inboxes/:id(.:format)` | `api/v1/accounts/inboxes#show` |
| PATCH | `/api/v1/accounts/:account_id/inboxes/:id(.:format)` | `api/v1/accounts/inboxes#update` |
| PUT | `/api/v1/accounts/:account_id/inboxes/:id(.:format)` | `api/v1/accounts/inboxes#update` |
| DELETE | `/api/v1/accounts/:account_id/inboxes/:id(.:format)` | `api/v1/accounts/inboxes#destroy` |
| DELETE | `/api/v1/accounts/:account_id/inbox_members(.:format)` | `api/v1/accounts/inbox_members#destroy` |
| PATCH | `/api/v1/accounts/:account_id/inbox_members(.:format)` | `api/v1/accounts/inbox_members#update` |
| POST | `/api/v1/accounts/:account_id/inbox_members(.:format)` | `api/v1/accounts/inbox_members#create` |
| GET | `/api/v1/accounts/:account_id/inbox_members/:inbox_id(.:format)` | `api/v1/accounts/inbox_members#show` |

## Database tables (3)

`inbox_members`, `inboxes`, `working_hours`

## Backend files (32)

### controllers (5)

- `app/controllers/api/v1/accounts/concerns/inbox_health_management.rb`
- `app/controllers/api/v1/accounts/concerns/inbox_secret_management.rb`
- `app/controllers/api/v1/accounts/inbox_members_controller.rb`
- `app/controllers/api/v1/accounts/inboxes_controller.rb`
- `enterprise/app/controllers/enterprise/api/v1/accounts/inboxes_controller.rb` (EE)

### helpers (1)

- `app/helpers/api/v1/inboxes_helper.rb`

### lib (2)

- `lib/custom_exceptions/inbox/limit_exceeded.rb`
- `lib/tasks/social_channels.rake`

### models (9)

- `app/models/concerns/channelable.rb`
- `app/models/concerns/inbox_bot_status.rb`
- `app/models/concerns/out_of_offisable.rb`
- `app/models/inbox.rb`
- `app/models/inbox_member.rb`
- `app/models/working_hour.rb`
- `enterprise/app/models/enterprise/channelable.rb` (EE)
- `enterprise/app/models/enterprise/concerns/inbox.rb` (EE)
- `enterprise/app/models/enterprise/inbox.rb` (EE)

### policies (1)

- `app/policies/inbox_policy.rb`

### presenters (1)

- `app/presenters/inbox/event_data_presenter.rb`

### services (2)

- `app/services/base/send_on_channel_service.rb`
- `app/services/social_channels/provider_name_backfill_service.rb`

### views (11)

- `app/views/api/v1/accounts/inbox_members/create.json.jbuilder`
- `app/views/api/v1/accounts/inbox_members/show.json.jbuilder`
- `app/views/api/v1/accounts/inbox_members/update.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/create.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/index.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/reset_secret.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/show.json.jbuilder`
- `app/views/api/v1/accounts/inboxes/update.json.jbuilder`
- `app/views/api/v1/models/_inbox.json.jbuilder`
- `app/views/api/v1/models/_inbox_slim.json.jbuilder`
- `app/views/public/api/v1/models/_inbox.json.jbuilder`

## Ruby specs (11)

- `spec/controllers/api/v1/accounts/inbox_members_controller_spec.rb`
- `spec/controllers/api/v1/accounts/inboxes_controller_spec.rb`
- `spec/controllers/public/api/v1/inbox/inboxes_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/inboxes_controller_spec.rb`
- `spec/enterprise/models/inbox_member_spec.rb`
- `spec/enterprise/models/inbox_spec.rb`
- `spec/models/inbox_member_spec.rb`
- `spec/models/inbox_spec.rb`
- `spec/models/working_hour_spec.rb`
- `spec/policies/inbox_policy_spec.rb`
- `spec/services/social_channels/provider_name_backfill_service_spec.rb`

## Frontend files (84)

- `app/javascript/dashboard/api/channel/fbChannel.js`
- `app/javascript/dashboard/api/channel/googleClient.js`
- `app/javascript/dashboard/api/channel/webChannel.js`
- `app/javascript/dashboard/api/channels.js`
- `app/javascript/dashboard/api/inboxHealth.js`
- `app/javascript/dashboard/api/inboxMembers.js`
- `app/javascript/dashboard/api/inboxes.js`
- `app/javascript/dashboard/api/specs/channel/fbChannel.spec.js`
- `app/javascript/dashboard/api/specs/channel/webChannel.spec.js`
- `app/javascript/dashboard/api/specs/inboxes.spec.js`
- `app/javascript/dashboard/assets/images/inboxes.svg`
- `app/javascript/dashboard/assets/images/no-inboxes.svg`
- `app/javascript/dashboard/components-next/Inbox/InboxCard.vue`
- `app/javascript/dashboard/components-next/icon/ChannelIcon.story.vue`
- `app/javascript/dashboard/components-next/icon/ChannelIcon.vue`
- `app/javascript/dashboard/components-next/sidebar/ChannelLeaf.vue`
- `app/javascript/dashboard/components-next/sidebar/specs/ChannelLeaf.spec.js`
- `app/javascript/dashboard/components/ChannelSelector.vue`
- `app/javascript/dashboard/composables/commands/spec/useInboxHotKeys.spec.js`
- `app/javascript/dashboard/composables/commands/useInboxHotKeys.js`
- `app/javascript/dashboard/composables/spec/useInbox.spec.js`
- `app/javascript/dashboard/composables/useInbox.js`
- `app/javascript/dashboard/helper/inbox.js`
- `app/javascript/dashboard/helper/specs/inbox.spec.js`
- `app/javascript/dashboard/helper/specs/inboxFixture.js`
- `app/javascript/dashboard/routes/dashboard/inbox/InboxEmptyState.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/InboxList.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/InboxView.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/components/InboxContextMenu.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/components/InboxDisplayMenu.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/components/InboxItemHeader.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/components/InboxListHeader.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/components/InboxOptionMenu.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/components/MenuItem.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/components/PaginationButton.vue`
- `app/javascript/dashboard/routes/dashboard/inbox/helpers/InboxViewHelpers.js`
- `app/javascript/dashboard/routes/dashboard/inbox/routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/ChannelFactory.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/ChannelList.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/FinishSetup.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/InboxChannels.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/Settings.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Api.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Email.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Website.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/emailChannels/EmailInboxFinish.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/emailChannels/ForwardToOption.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/emailChannels/Google.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/emailChannels/OAuthChannel.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/AccountHealth.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/BotConfiguration.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/BusinessDay.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/ChannelName.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/InboxHealthState.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/InboxReconnectionRequired.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/InputRadioGroup.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/SenderNameExamplePreview.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/SingleSelectDropdown.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/specs/AccountHealth.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/helpers/businessHour.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/helpers/specs/businessHour.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/helpers/timezones.json`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/inbox.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/CallBusinessHoursSettings.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/CollaboratorsPage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/ConfigurationPage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/CustomerSatisfactionPage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/components/ConfirmTemplateUpdateDialog.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/components/HmacSecretKey.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/specs/CallBusinessHoursSettings.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/specs/ConfigurationPage.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/specs/FinishSetup.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/specs/Settings.spec.js`
- `app/javascript/dashboard/store/modules/inboxMembers.js`
- `app/javascript/dashboard/store/modules/inboxes.js`
- `app/javascript/dashboard/store/modules/inboxes/channelActions.js`
- `app/javascript/dashboard/store/modules/specs/inboxes/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/inboxes/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/inboxes/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/inboxes/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/inboxes/templateFixtures.js`
- `app/javascript/shared/mixins/inboxMixin.js`
- `app/javascript/shared/mixins/specs/inboxMixin.spec.js`
