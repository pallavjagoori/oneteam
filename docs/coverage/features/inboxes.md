# Inboxes: coverage gaps

## Frontend: 37.4% (862 of 2304 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/Settings.vue` | 9.5% | 237 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/CustomerSatisfactionPage.vue` | 7.5% | 184 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/CollaboratorsPage.vue` | 20.5% | 182 |
| `app/javascript/dashboard/routes/dashboard/inbox/InboxList.vue` | 1.0% | 99 |
| `app/javascript/dashboard/routes/dashboard/inbox/InboxView.vue` | 1.3% | 78 |
| `app/javascript/dashboard/store/modules/inboxes.js` | 56.6% | 75 |
| `app/javascript/dashboard/components-next/Inbox/InboxCard.vue` | 9.2% | 59 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/ConfigurationPage.vue` | 35.9% | 59 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/Index.vue` | 12.1% | 51 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/BusinessDay.vue` | 28.3% | 33 |
| `app/javascript/dashboard/routes/dashboard/inbox/components/InboxDisplayMenu.vue` | 23.7% | 29 |
| `app/javascript/dashboard/routes/dashboard/inbox/components/InboxItemHeader.vue` | 12.1% | 29 |
| `app/javascript/dashboard/routes/dashboard/inbox/components/InboxListHeader.vue` | 20.0% | 24 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/BotConfiguration.vue` | 15.4% | 22 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/components/HmacSecretKey.vue` | 15.4% | 22 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/InboxChannels.vue` | 12.5% | 21 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/ChannelList.vue` | 4.8% | 20 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/ChannelName.vue` | 0.0% | 18 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/FinishSetup.vue` | 82.2% | 16 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Email.vue` | 6.3% | 15 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/emailChannels/ForwardToOption.vue` | 33.3% | 14 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/AccountHealth.vue` | 88.4% | 14 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Api.vue` | 38.1% | 13 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/emailChannels/OAuthChannel.vue` | 7.1% | 13 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/SenderNameExamplePreview.vue` | 27.8% | 13 |
| `app/javascript/dashboard/components-next/icon/ChannelIcon.story.vue` | 0.0% | 10 |
| `app/javascript/dashboard/routes/dashboard/inbox/components/InboxContextMenu.vue` | 9.1% | 10 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/components/ConfirmTemplateUpdateDialog.vue` | 0.0% | 10 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Website.vue` | 59.1% | 9 |
| `app/javascript/dashboard/components-next/icon/ChannelIcon.vue` | 0.0% | 7 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/emailChannels/EmailInboxFinish.vue` | 36.4% | 7 |
| `app/javascript/dashboard/routes/dashboard/inbox/components/PaginationButton.vue` | 45.5% | 6 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/SingleSelectDropdown.vue` | 25.0% | 6 |
| `app/javascript/dashboard/routes/dashboard/inbox/components/InboxOptionMenu.vue` | 37.5% | 5 |
| `app/javascript/dashboard/store/modules/inboxes/channelActions.js` | 80.8% | 5 |
| `app/javascript/dashboard/routes/dashboard/inbox/InboxEmptyState.vue` | 42.9% | 4 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/InboxReconnectionRequired.vue` | 0.0% | 4 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/InputRadioGroup.vue` | 55.6% | 4 |
| `app/javascript/shared/mixins/inboxMixin.js` | 90.9% | 4 |
| `app/javascript/dashboard/components/ChannelSelector.vue` | 77.8% | 2 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/ChannelFactory.vue` | 50.0% | 2 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/CallBusinessHoursSettings.vue` | 95.0% | 2 |
| `app/javascript/dashboard/store/modules/inboxMembers.js` | 33.3% | 2 |
| `app/javascript/dashboard/composables/commands/useInboxHotKeys.js` | 92.3% | 1 |
| `app/javascript/dashboard/routes/dashboard/inbox/components/MenuItem.vue` | 50.0% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/emailChannels/Google.vue` | 0.0% | 1 |

## Backend: 94.0% (800 of 851 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `enterprise/app/controllers/enterprise/api/v1/accounts/inboxes_controller.rb` | 78.8% | 14 |
| `app/helpers/api/v1/inboxes_helper.rb` | 81.4% | 11 |
| `app/controllers/api/v1/accounts/concerns/inbox_health_management.rb` | 91.9% | 5 |
| `app/controllers/api/v1/accounts/inboxes_controller.rb` | 95.5% | 5 |
| `app/models/inbox.rb` | 96.9% | 4 |
| `app/policies/inbox_policy.rb` | 92.3% | 4 |
| `app/controllers/api/v1/accounts/concerns/inbox_secret_management.rb` | 77.8% | 2 |
| `app/services/base/send_on_channel_service.rb` | 91.3% | 2 |
| `app/services/social_channels/provider_name_backfill_service.rb` | 98.3% | 2 |
| `app/models/working_hour.rb` | 97.7% | 1 |
| `lib/tasks/social_channels.rake` | 75.0% | 1 |
