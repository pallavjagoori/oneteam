# Website live chat widget

**Area:** Channels

The embeddable live chat widget, its SDK, widget API, pre-chat forms, widget campaigns and widget settings.

**Feature flags:** `channel_website`

## HTTP routes (26)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/widget(.:format)` | `widgets#show` |
| POST | `/api/v1/widget/direct_uploads(.:format)` | `api/v1/widget/direct_uploads#create` |
| POST | `/api/v1/widget/config(.:format)` | `api/v1/widget/configs#create` |
| GET | `/api/v1/widget/campaigns(.:format)` | `api/v1/widget/campaigns#index` |
| POST | `/api/v1/widget/events(.:format)` | `api/v1/widget/events#create` |
| GET | `/api/v1/widget/messages(.:format)` | `api/v1/widget/messages#index` |
| POST | `/api/v1/widget/messages(.:format)` | `api/v1/widget/messages#create` |
| PATCH | `/api/v1/widget/messages/:id(.:format)` | `api/v1/widget/messages#update` |
| PUT | `/api/v1/widget/messages/:id(.:format)` | `api/v1/widget/messages#update` |
| POST | `/api/v1/widget/conversations/destroy_custom_attributes(.:format)` | `api/v1/widget/conversations#destroy_custom_attributes` |
| POST | `/api/v1/widget/conversations/set_custom_attributes(.:format)` | `api/v1/widget/conversations#set_custom_attributes` |
| POST | `/api/v1/widget/conversations/update_last_seen(.:format)` | `api/v1/widget/conversations#update_last_seen` |
| POST | `/api/v1/widget/conversations/toggle_typing(.:format)` | `api/v1/widget/conversations#toggle_typing` |
| POST | `/api/v1/widget/conversations/transcript(.:format)` | `api/v1/widget/conversations#transcript` |
| GET | `/api/v1/widget/conversations/toggle_status(.:format)` | `api/v1/widget/conversations#toggle_status` |
| GET | `/api/v1/widget/conversations(.:format)` | `api/v1/widget/conversations#index` |
| POST | `/api/v1/widget/conversations(.:format)` | `api/v1/widget/conversations#create` |
| POST | `/api/v1/widget/contact/destroy_custom_attributes(.:format)` | `api/v1/widget/contacts#destroy_custom_attributes` |
| PATCH | `/api/v1/widget/contact/set_user(.:format)` | `api/v1/widget/contacts#set_user` |
| GET | `/api/v1/widget/contact(.:format)` | `api/v1/widget/contacts#show` |
| PATCH | `/api/v1/widget/contact(.:format)` | `api/v1/widget/contacts#update` |
| PUT | `/api/v1/widget/contact(.:format)` | `api/v1/widget/contacts#update` |
| GET | `/api/v1/widget/inbox_members(.:format)` | `api/v1/widget/inbox_members#index` |
| POST | `/api/v1/widget/labels(.:format)` | `api/v1/widget/labels#create` |
| DELETE | `/api/v1/widget/labels/:id(.:format)` | `api/v1/widget/labels#destroy` |
| POST | `/api/v1/widget/integrations/dyte/add_participant_to_meeting(.:format)` | `api/v1/widget/integrations/dyte#add_participant_to_meeting` |

## Database tables (1)

`channel_web_widgets`

## Backend files (36)

### controllers (15)

- `app/controllers/api/v1/widget/base_controller.rb`
- `app/controllers/api/v1/widget/campaigns_controller.rb`
- `app/controllers/api/v1/widget/configs_controller.rb`
- `app/controllers/api/v1/widget/contacts_controller.rb`
- `app/controllers/api/v1/widget/conversations_controller.rb`
- `app/controllers/api/v1/widget/direct_uploads_controller.rb`
- `app/controllers/api/v1/widget/events_controller.rb`
- `app/controllers/api/v1/widget/inbox_members_controller.rb`
- `app/controllers/api/v1/widget/integrations/dyte_controller.rb`
- `app/controllers/api/v1/widget/labels_controller.rb`
- `app/controllers/api/v1/widget/messages_controller.rb`
- `app/controllers/concerns/website_token_helper.rb`
- `app/controllers/widget_tests_controller.rb`
- `app/controllers/widgets_controller.rb`
- `enterprise/app/controllers/enterprise/widgets_controller.rb` (EE)

### helpers (2)

- `app/helpers/api/v1/widget/messages_helper.rb`
- `app/helpers/widget_helper.rb`

### jobs (2)

- `app/jobs/inboxes/sync_widget_pre_chat_custom_fields_job.rb`
- `app/jobs/inboxes/update_widget_pre_chat_custom_fields_job.rb`

### models (1)

- `app/models/channel/web_widget.rb`

### services (3)

- `app/services/onboarding/web_widget_creation_service.rb`
- `app/services/widget/token_service.rb`
- `enterprise/app/services/enterprise/onboarding/web_widget_creation_service.rb` (EE)

### views (13)

- `app/views/api/v1/widget/campaigns/index.json.jbuilder`
- `app/views/api/v1/widget/configs/create.json.jbuilder`
- `app/views/api/v1/widget/contacts/set_user.json.jbuilder`
- `app/views/api/v1/widget/contacts/show.json.jbuilder`
- `app/views/api/v1/widget/contacts/update.json.jbuilder`
- `app/views/api/v1/widget/conversations/create.json.jbuilder`
- `app/views/api/v1/widget/conversations/index.json.jbuilder`
- `app/views/api/v1/widget/inbox_members/index.json.jbuilder`
- `app/views/api/v1/widget/messages/create.json.jbuilder`
- `app/views/api/v1/widget/messages/index.json.jbuilder`
- `app/views/api/v1/widget/messages/update.json.jbuilder`
- `app/views/widget_tests/index.html.erb`
- `app/views/widgets/show.html.erb`

## Ruby specs (18)

- `spec/controllers/api/v1/widget/campaigns_controller_spec.rb`
- `spec/controllers/api/v1/widget/configs_controller_spec.rb`
- `spec/controllers/api/v1/widget/contacts_controller_spec.rb`
- `spec/controllers/api/v1/widget/conversations_controller_spec.rb`
- `spec/controllers/api/v1/widget/direct_uploads_controller_spec.rb`
- `spec/controllers/api/v1/widget/events_controller_spec.rb`
- `spec/controllers/api/v1/widget/inbox_members_controller_spec.rb`
- `spec/controllers/api/v1/widget/integrations/dyte_controller_spec.rb`
- `spec/controllers/api/v1/widget/labels_controller_spec.rb`
- `spec/controllers/api/v1/widget/messages_controller_spec.rb`
- `spec/controllers/widget_tests_controller_spec.rb`
- `spec/controllers/widgets_controller_spec.rb`
- `spec/enterprise/services/enterprise/onboarding/web_widget_creation_service_spec.rb`
- `spec/jobs/inboxes/sync_widget_pre_chat_custom_fields_job_spec.rb`
- `spec/jobs/inboxes/update_widget_pre_chat_custom_fields_job_spec.rb`
- `spec/models/channel/web_widget_spec.rb`
- `spec/services/widget/token_service_expiry_spec.rb`
- `spec/services/widget/token_service_spec.rb`

## Frontend files (289)

- `app/javascript/dashboard/components/widgets/AILoader.vue`
- `app/javascript/dashboard/components/widgets/AttachmentsPreview.vue`
- `app/javascript/dashboard/components/widgets/AutomationActionInput.vue`
- `app/javascript/dashboard/components/widgets/AutomationActionTeamMessageInput.vue`
- `app/javascript/dashboard/components/widgets/AutomationFileInput.vue`
- `app/javascript/dashboard/components/widgets/BackButton.vue`
- `app/javascript/dashboard/components/widgets/ChannelItem.vue`
- `app/javascript/dashboard/components/widgets/ChatTypeTabs.vue`
- `app/javascript/dashboard/components/widgets/ColorPicker.vue`
- `app/javascript/dashboard/components/widgets/DashboardApp/Frame.vue`
- `app/javascript/dashboard/components/widgets/DashboardApp/specs/Frame.spec.js`
- `app/javascript/dashboard/components/widgets/EmptyState.vue`
- `app/javascript/dashboard/components/widgets/FeatureToggle.vue`
- `app/javascript/dashboard/components/widgets/FilterInput/FilterOperatorTypes.js`
- `app/javascript/dashboard/components/widgets/FilterInput/FilterOperatorTypes.spec.js`
- `app/javascript/dashboard/components/widgets/InboxName.vue`
- `app/javascript/dashboard/components/widgets/LoadingState.vue`
- `app/javascript/dashboard/components/widgets/RequestContactInfoButton.vue`
- `app/javascript/dashboard/components/widgets/SettingIntroBanner.vue`
- `app/javascript/dashboard/components/widgets/ShowMore.vue`
- `app/javascript/dashboard/components/widgets/TableFooter.vue`
- `app/javascript/dashboard/components/widgets/TableFooterPagination.vue`
- `app/javascript/dashboard/components/widgets/TableFooterResults.vue`
- `app/javascript/dashboard/components/widgets/TableHeaderCell.vue`
- `app/javascript/dashboard/components/widgets/ThumbnailGroup.vue`
- `app/javascript/dashboard/components/widgets/UserAvatarWithName.vue`
- `app/javascript/dashboard/components/widgets/VideoCallButton.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/AudioRecorder.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/Editor.spec.js`
- `app/javascript/dashboard/components/widgets/WootWriter/Editor.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/EditorModeToggle.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/FullEditor.spec.js`
- `app/javascript/dashboard/components/widgets/WootWriter/FullEditor.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/ReplyTopPanel.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/SlashCommandMenu.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/VideoEmbedInput.spec.js`
- `app/javascript/dashboard/components/widgets/WootWriter/VideoEmbedInput.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/constants.js`
- `app/javascript/dashboard/components/widgets/WootWriter/keyboardEmojiSelector.vue`
- `app/javascript/dashboard/components/widgets/WootWriter/utils/audioConversionUtils.js`
- `app/javascript/dashboard/components/widgets/WootWriter/utils/webmOpusToOgg.js`
- `app/javascript/dashboard/components/widgets/conversation/CannedResponse.vue`
- `app/javascript/dashboard/components/widgets/conversation/CollapsedReplyBar.vue`
- `app/javascript/dashboard/components/widgets/conversation/ContactConversationLink.vue`
- `app/javascript/dashboard/components/widgets/conversation/ContentTemplates/ContentTemplatesModal.vue`
- `app/javascript/dashboard/components/widgets/conversation/ContentTemplates/ContentTemplatesPicker.vue`
- `app/javascript/dashboard/components/widgets/conversation/ConversationBasicFilter.vue`
- `app/javascript/dashboard/components/widgets/conversation/ConversationBox.vue`
- `app/javascript/dashboard/components/widgets/conversation/ConversationCallButton.vue`
- `app/javascript/dashboard/components/widgets/conversation/ConversationCard.vue`
- `app/javascript/dashboard/components/widgets/conversation/ConversationHeader.vue`
- `app/javascript/dashboard/components/widgets/conversation/ConversationSidebar.vue`
- `app/javascript/dashboard/components/widgets/conversation/EmailTranscriptModal.vue`
- `app/javascript/dashboard/components/widgets/conversation/EmptyState/EmptyState.vue`
- `app/javascript/dashboard/components/widgets/conversation/EmptyState/EmptyStateMessage.vue`
- `app/javascript/dashboard/components/widgets/conversation/EmptyState/FeaturePlaceholder.vue`
- `app/javascript/dashboard/components/widgets/conversation/FilterItem.vue`
- `app/javascript/dashboard/components/widgets/conversation/MacroList.vue`
- `app/javascript/dashboard/components/widgets/conversation/MessagePreview.vue`
- `app/javascript/dashboard/components/widgets/conversation/MessageSignatureMissingAlert.vue`
- `app/javascript/dashboard/components/widgets/conversation/MessagesView.vue`
- `app/javascript/dashboard/components/widgets/conversation/MoreActions.vue`
- `app/javascript/dashboard/components/widgets/conversation/OnboardingFeatureCard.vue`
- `app/javascript/dashboard/components/widgets/conversation/OnboardingView.vue`
- `app/javascript/dashboard/components/widgets/conversation/QuotedEmailPreview.vue`
- `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`
- `app/javascript/dashboard/components/widgets/conversation/ReplyBoxBanner.vue`
- `app/javascript/dashboard/components/widgets/conversation/ReplyEmailHead.vue`
- `app/javascript/dashboard/components/widgets/conversation/ReplyToMessage.vue`
- `app/javascript/dashboard/components/widgets/conversation/ResizableEditorWrapper.vue`
- `app/javascript/dashboard/components/widgets/conversation/ShopifyOrderItem.vue`
- `app/javascript/dashboard/components/widgets/conversation/ShopifyOrdersList.vue`
- `app/javascript/dashboard/components/widgets/conversation/StripeCustomer.vue`
- `app/javascript/dashboard/components/widgets/conversation/StripeSubscription.vue`
- `app/javascript/dashboard/components/widgets/conversation/TagAgents.vue`
- `app/javascript/dashboard/components/widgets/conversation/TagTools.vue`
- `app/javascript/dashboard/components/widgets/conversation/VariableList.vue`
- `app/javascript/dashboard/components/widgets/conversation/advancedFilterItems/index.js`
- `app/javascript/dashboard/components/widgets/conversation/advancedFilterItems/languages.js`
- `app/javascript/dashboard/components/widgets/conversation/advancedFilterItems/specs/advancedFilterItems.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/advancedFilterItems/specs/languages.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/components/GalleryView.vue`
- `app/javascript/dashboard/components/widgets/conversation/components/SLACardLabel.vue`
- `app/javascript/dashboard/components/widgets/conversation/components/SLAEventItem.vue`
- `app/javascript/dashboard/components/widgets/conversation/components/SLAPopoverCard.vue`
- `app/javascript/dashboard/components/widgets/conversation/contextMenu/Index.vue`
- `app/javascript/dashboard/components/widgets/conversation/contextMenu/agentLoadingPlaceholder.vue`
- `app/javascript/dashboard/components/widgets/conversation/contextMenu/menuItem.vue`
- `app/javascript/dashboard/components/widgets/conversation/contextMenu/menuItemWithSubmenu.vue`
- `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkAgentActions.vue`
- `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkLabelActions.vue`
- `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkMacroActions.vue`
- `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkTeamActions.vue`
- `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkUpdateActions.vue`
- `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/Index.vue`
- `app/javascript/dashboard/components/widgets/conversation/conversationCardComponents/CardLabels.vue`
- `app/javascript/dashboard/components/widgets/conversation/helpers/campaignScrollAnchor.js`
- `app/javascript/dashboard/components/widgets/conversation/helpers/emailHeadHelper.js`
- `app/javascript/dashboard/components/widgets/conversation/helpers/scrollTopCalculationHelper.js`
- `app/javascript/dashboard/components/widgets/conversation/helpers/specs/campaignScrollAnchor.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/helpers/specs/emailHeadHelper.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/helpers/specs/scrollTopCalculationHelper.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/linear/CreateIssue.vue`
- `app/javascript/dashboard/components/widgets/conversation/linear/CreateOrLinkIssue.vue`
- `app/javascript/dashboard/components/widgets/conversation/linear/IssueHeader.vue`
- `app/javascript/dashboard/components/widgets/conversation/linear/IssuesList.vue`
- `app/javascript/dashboard/components/widgets/conversation/linear/LinearIssueItem.vue`
- `app/javascript/dashboard/components/widgets/conversation/linear/LinearSetupCTA.vue`
- `app/javascript/dashboard/components/widgets/conversation/linear/LinkIssue.vue`
- `app/javascript/dashboard/components/widgets/conversation/linear/SearchableDropdown.vue`
- `app/javascript/dashboard/components/widgets/conversation/linear/validations.js`
- `app/javascript/dashboard/components/widgets/conversation/specs/CollapsedReplyBar.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/specs/ContactConversationLink.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/specs/ConversationCard.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBoxBanner.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/specs/ResizableEditorWrapper.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/specs/StripeCustomer.spec.js`
- `app/javascript/dashboard/components/widgets/forms/Input.vue`
- `app/javascript/dashboard/components/widgets/forms/PhoneInput.vue`
- `app/javascript/dashboard/components/widgets/modal/ConfirmDeleteModal.vue`
- `app/javascript/dashboard/components/widgets/modal/ConfirmationModal.vue`
- `app/javascript/dashboard/components/widgets/modal/DeleteModal.vue`
- `app/javascript/dashboard/components/widgets/modal/WootKeyShortcutModal.vue`
- `app/javascript/dashboard/components/widgets/modal/constants.js`
- `app/javascript/dashboard/helper/preChat.js`
- `app/javascript/dashboard/helper/specs/preChat.spec.js`
- `app/javascript/dashboard/modules/widget-preview/components/Widget.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/PreChatForm/PreChatFields.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/PreChatForm/Settings.vue`
- `app/javascript/entrypoints/widget.js`
- `app/javascript/sdk/DOMHelpers.js`
- `app/javascript/sdk/IFrameHelper.js`
- `app/javascript/sdk/bubbleHelpers.js`
- `app/javascript/sdk/constants.js`
- `app/javascript/sdk/cookieHelpers.js`
- `app/javascript/sdk/sdk.css`
- `app/javascript/sdk/settingsHelper.js`
- `app/javascript/sdk/specs/cookieHelpers.spec.js`
- `app/javascript/sdk/specs/settingsHelpers.spec.js`
- `app/javascript/shared/assets/fonts/widget_fonts.scss`
- `app/javascript/widget/App.vue`
- `app/javascript/widget/api/agent.js`
- `app/javascript/widget/api/article.js`
- `app/javascript/widget/api/campaign.js`
- `app/javascript/widget/api/contacts.js`
- `app/javascript/widget/api/conversation.js`
- `app/javascript/widget/api/conversationLabels.js`
- `app/javascript/widget/api/endPoints.js`
- `app/javascript/widget/api/events.js`
- `app/javascript/widget/api/integration.js`
- `app/javascript/widget/api/message.js`
- `app/javascript/widget/api/specs/endPoints.spec.js`
- `app/javascript/widget/assets/images/defaultUser.png`
- `app/javascript/widget/assets/images/logo.svg`
- `app/javascript/widget/assets/images/message-send.svg`
- `app/javascript/widget/assets/images/paperclip.svg`
- `app/javascript/widget/assets/images/send.png`
- `app/javascript/widget/assets/images/typing.gif`
- `app/javascript/widget/assets/scss/_reset.scss`
- `app/javascript/widget/assets/scss/views/_conversation.scss`
- `app/javascript/widget/assets/scss/woot.scss`
- `app/javascript/widget/components/AgentMessage.vue`
- `app/javascript/widget/components/AgentMessageBubble.vue`
- `app/javascript/widget/components/AgentTypingBubble.vue`
- `app/javascript/widget/components/Availability/AvailabilityContainer.vue`
- `app/javascript/widget/components/Availability/AvailabilityText.story.vue`
- `app/javascript/widget/components/Availability/AvailabilityText.vue`
- `app/javascript/widget/components/Banner.vue`
- `app/javascript/widget/components/ChatAttachment.vue`
- `app/javascript/widget/components/ChatFooter.vue`
- `app/javascript/widget/components/ChatHeader.vue`
- `app/javascript/widget/components/ChatHeaderExpanded.vue`
- `app/javascript/widget/components/ChatInputWrap.vue`
- `app/javascript/widget/components/ChatMessage.vue`
- `app/javascript/widget/components/ChatSendButton.vue`
- `app/javascript/widget/components/ConversationWrap.vue`
- `app/javascript/widget/components/DragWrapper.vue`
- `app/javascript/widget/components/FileBubble.vue`
- `app/javascript/widget/components/FooterReplyTo.vue`
- `app/javascript/widget/components/Form/PhoneInput.vue`
- `app/javascript/widget/components/GroupedAvatars.vue`
- `app/javascript/widget/components/HeaderActions.vue`
- `app/javascript/widget/components/ImageBubble.vue`
- `app/javascript/widget/components/MessageReplyButton.vue`
- `app/javascript/widget/components/PreChat/Form.vue`
- `app/javascript/widget/components/PreChat/specs/Form.spec.js`
- `app/javascript/widget/components/ReplyToChip.vue`
- `app/javascript/widget/components/TeamAvailability.vue`
- `app/javascript/widget/components/TranslatingContent.vue`
- `app/javascript/widget/components/UnreadMessage.vue`
- `app/javascript/widget/components/UnreadMessageList.vue`
- `app/javascript/widget/components/UserMessage.vue`
- `app/javascript/widget/components/UserMessageBubble.vue`
- `app/javascript/widget/components/VideoBubble.vue`
- `app/javascript/widget/components/layouts/ViewWithHeader.vue`
- `app/javascript/widget/components/pageComponents/Home/Article/ArticleBlock.vue`
- `app/javascript/widget/components/pageComponents/Home/Article/ArticleContainer.vue`
- `app/javascript/widget/components/pageComponents/Home/Article/ArticleListItem.vue`
- `app/javascript/widget/components/pageComponents/Home/Article/SkeletonLoader.vue`
- `app/javascript/widget/components/specs/AgentIdentityRendering.spec.js`
- `app/javascript/widget/components/specs/RtlDirectionalIcons.spec.js`
- `app/javascript/widget/components/template/Article.vue`
- `app/javascript/widget/components/template/EmailInput.vue`
- `app/javascript/widget/components/template/IntegrationCard.vue`
- `app/javascript/widget/composables/specs/useAttachments.spec.js`
- `app/javascript/widget/composables/specs/useAvailability.spec.js`
- `app/javascript/widget/composables/specs/useDarkMode.spec.js`
- `app/javascript/widget/composables/useAttachments.js`
- `app/javascript/widget/composables/useAvailability.js`
- `app/javascript/widget/composables/useDarkMode.js`
- `app/javascript/widget/constants/errorTypes.js`
- `app/javascript/widget/constants/sdkEvents.js`
- `app/javascript/widget/constants/widgetBusEvents.js`
- `app/javascript/widget/helpers/IframeEventHelper.js`
- `app/javascript/widget/helpers/WidgetAudioNotificationHelper.js`
- `app/javascript/widget/helpers/actionCable.js`
- `app/javascript/widget/helpers/availabilityHelpers.js`
- `app/javascript/widget/helpers/axios.js`
- `app/javascript/widget/helpers/campaignHelper.js`
- `app/javascript/widget/helpers/campaignTimer.js`
- `app/javascript/widget/helpers/constants.js`
- `app/javascript/widget/helpers/popoutHelper.js`
- `app/javascript/widget/helpers/specs/actionCable.spec.js`
- `app/javascript/widget/helpers/specs/availabilityHelpers.spec.js`
- `app/javascript/widget/helpers/specs/campaignFixtures.js`
- `app/javascript/widget/helpers/specs/campaignHelper.spec.js`
- `app/javascript/widget/helpers/specs/translations.spec.js`
- `app/javascript/widget/helpers/specs/urlParamsHelper.spec.js`
- `app/javascript/widget/helpers/specs/utils.spec.js`
- `app/javascript/widget/helpers/translations.js`
- `app/javascript/widget/helpers/urlParamsHelper.js`
- `app/javascript/widget/helpers/utils.js`
- `app/javascript/widget/helpers/uuid.js`
- `app/javascript/widget/mixins/configMixin.js`
- `app/javascript/widget/mixins/messageMixin.js`
- `app/javascript/widget/mixins/specs/configMixin.spec.js`
- `app/javascript/widget/mixins/specs/messageFixture.js`
- `app/javascript/widget/mixins/specs/messageMixin.spec.js`
- `app/javascript/widget/router.js`
- `app/javascript/widget/store/index.js`
- `app/javascript/widget/store/modules/agent.js`
- `app/javascript/widget/store/modules/appConfig.js`
- `app/javascript/widget/store/modules/articles.js`
- `app/javascript/widget/store/modules/campaign.js`
- `app/javascript/widget/store/modules/contacts.js`
- `app/javascript/widget/store/modules/conversation/actions.js`
- `app/javascript/widget/store/modules/conversation/getters.js`
- `app/javascript/widget/store/modules/conversation/helpers.js`
- `app/javascript/widget/store/modules/conversation/index.js`
- `app/javascript/widget/store/modules/conversation/mutations.js`
- `app/javascript/widget/store/modules/conversationAttributes.js`
- `app/javascript/widget/store/modules/conversationLabels.js`
- `app/javascript/widget/store/modules/events.js`
- `app/javascript/widget/store/modules/message.js`
- `app/javascript/widget/store/modules/specs/agent/actions.spec.js`
- `app/javascript/widget/store/modules/specs/agent/data.js`
- `app/javascript/widget/store/modules/specs/agent/getters.spec.js`
- `app/javascript/widget/store/modules/specs/agent/mutations.spec.js`
- `app/javascript/widget/store/modules/specs/appConfig/actions.spec.js`
- `app/javascript/widget/store/modules/specs/appConfig/getters.spec.js`
- `app/javascript/widget/store/modules/specs/appConfig/mutations.spec.js`
- `app/javascript/widget/store/modules/specs/articles.spec.js`
- `app/javascript/widget/store/modules/specs/campaign/actions.spec.js`
- `app/javascript/widget/store/modules/specs/campaign/data.js`
- `app/javascript/widget/store/modules/specs/campaign/getters.spec.js`
- `app/javascript/widget/store/modules/specs/campaign/mutations.spec.js`
- `app/javascript/widget/store/modules/specs/contact/actions.spec.js`
- `app/javascript/widget/store/modules/specs/contact/getters.spec.js`
- `app/javascript/widget/store/modules/specs/contact/mutations.spec.js`
- `app/javascript/widget/store/modules/specs/conversation/actions.spec.js`
- `app/javascript/widget/store/modules/specs/conversation/getters.spec.js`
- `app/javascript/widget/store/modules/specs/conversation/helpers.spec.js`
- `app/javascript/widget/store/modules/specs/conversation/mutations.spec.js`
- `app/javascript/widget/store/modules/specs/conversationAttributes/actions.spec.js`
- `app/javascript/widget/store/modules/specs/conversationAttributes/getters.spec.js`
- `app/javascript/widget/store/modules/specs/conversationAttributes/mutations.spec.js`
- `app/javascript/widget/store/modules/specs/message/actions.spec.js`
- `app/javascript/widget/store/modules/specs/message/getters.spec.js`
- `app/javascript/widget/store/modules/specs/message/mutations.spec.js`
- `app/javascript/widget/store/types.js`
- `app/javascript/widget/views/ArticleViewer.vue`
- `app/javascript/widget/views/Campaigns.vue`
- `app/javascript/widget/views/Home.vue`
- `app/javascript/widget/views/Messages.vue`
- `app/javascript/widget/views/PreChatForm.vue`
- `app/javascript/widget/views/UnreadMessages.vue`
- `app/javascript/widget/views/specs/PreChatForm.spec.js`
