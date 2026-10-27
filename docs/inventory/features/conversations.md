# Conversations

**Area:** Conversations

The conversation inbox: list, status changes, assignment, priority, snooze, mute, participants, unread counts, transcripts, bulk actions and auto-resolve.

**Feature flags:** `conversation_unread_counts`, `auto_resolve_conversations`, `inbox_view`, `unread_count_for_filters`, `conversation_required_attributes`

## HTTP routes (24)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/bulk_actions(.:format)` | `api/v1/accounts/bulk_actions#create` |
| GET | `/api/v1/accounts/:account_id/conversations/meta(.:format)` | `api/v1/accounts/conversations#meta` |
| GET | `/api/v1/accounts/:account_id/conversations/unread_counts(.:format)` | `api/v1/accounts/conversations/unread_counts#index` |
| GET | `/api/v1/accounts/:account_id/conversations/:conversation_id/participants(.:format)` | `api/v1/accounts/conversations/participants#show` |
| PATCH | `/api/v1/accounts/:account_id/conversations/:conversation_id/participants(.:format)` | `api/v1/accounts/conversations/participants#update` |
| PUT | `/api/v1/accounts/:account_id/conversations/:conversation_id/participants(.:format)` | `api/v1/accounts/conversations/participants#update` |
| DELETE | `/api/v1/accounts/:account_id/conversations/:conversation_id/participants(.:format)` | `api/v1/accounts/conversations/participants#destroy` |
| POST | `/api/v1/accounts/:account_id/conversations/:conversation_id/participants(.:format)` | `api/v1/accounts/conversations/participants#create` |
| GET | `/api/v1/accounts/:account_id/conversations/:conversation_id/suggestions/priority(.:format)` | `api/v1/accounts/conversations/suggestions#priority` |
| POST | `/api/v1/accounts/:account_id/conversations/:id/mute(.:format)` | `api/v1/accounts/conversations#mute` |
| POST | `/api/v1/accounts/:account_id/conversations/:id/unmute(.:format)` | `api/v1/accounts/conversations#unmute` |
| POST | `/api/v1/accounts/:account_id/conversations/:id/transcript(.:format)` | `api/v1/accounts/conversations#transcript` |
| POST | `/api/v1/accounts/:account_id/conversations/:id/toggle_status(.:format)` | `api/v1/accounts/conversations#toggle_status` |
| POST | `/api/v1/accounts/:account_id/conversations/:id/toggle_priority(.:format)` | `api/v1/accounts/conversations#toggle_priority` |
| POST | `/api/v1/accounts/:account_id/conversations/:id/toggle_typing_status(.:format)` | `api/v1/accounts/conversations#toggle_typing_status` |
| POST | `/api/v1/accounts/:account_id/conversations/:id/update_last_seen(.:format)` | `api/v1/accounts/conversations#update_last_seen` |
| POST | `/api/v1/accounts/:account_id/conversations/:id/unread(.:format)` | `api/v1/accounts/conversations#unread` |
| GET | `/api/v1/accounts/:account_id/conversations(.:format)` | `api/v1/accounts/conversations#index` |
| POST | `/api/v1/accounts/:account_id/conversations(.:format)` | `api/v1/accounts/conversations#create` |
| GET | `/api/v1/accounts/:account_id/conversations/:id(.:format)` | `api/v1/accounts/conversations#show` |
| PATCH | `/api/v1/accounts/:account_id/conversations/:id(.:format)` | `api/v1/accounts/conversations#update` |
| PUT | `/api/v1/accounts/:account_id/conversations/:id(.:format)` | `api/v1/accounts/conversations#update` |
| DELETE | `/api/v1/accounts/:account_id/conversations/:id(.:format)` | `api/v1/accounts/conversations#destroy` |
| GET | `/app/accounts/:account_id/conversations/:id(.:format)` | `conversations#show` |

## Database tables (4)

`conversation_outcomes`, `conversation_participants`, `conversations`, `mentions`

## Backend files (61)

### builders (1)

- `app/builders/conversation_builder.rb`

### controllers (8)

- `app/controllers/api/v1/accounts/bulk_actions_controller.rb`
- `app/controllers/api/v1/accounts/conversations/base_controller.rb`
- `app/controllers/api/v1/accounts/conversations/participants_controller.rb`
- `app/controllers/api/v1/accounts/conversations/suggestions_controller.rb`
- `app/controllers/api/v1/accounts/conversations/unread_counts_controller.rb`
- `app/controllers/api/v1/accounts/conversations_controller.rb`
- `enterprise/app/controllers/enterprise/api/v1/accounts/conversations/suggestions_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/api/v1/accounts/conversations_controller.rb` (EE)

### finders (2)

- `app/finders/conversation_finder.rb`
- `enterprise/app/finders/enterprise/conversation_finder.rb` (EE)

### helpers (1)

- `app/helpers/api/v1/conversations_helper.rb`

### jobs (9)

- `app/jobs/account/conversations_resolution_scheduler_job.rb`
- `app/jobs/bulk_actions_job.rb`
- `app/jobs/conversation_reply_email_job.rb`
- `app/jobs/conversations/reopen_snoozed_conversations_job.rb`
- `app/jobs/conversations/resolution_job.rb`
- `app/jobs/conversations/user_mention_job.rb`
- `app/jobs/internal/remove_orphan_conversations_job.rb`
- `app/jobs/migration/conversations_first_reply_scheduler_job.rb`
- `enterprise/app/jobs/enterprise/account/conversations_resolution_scheduler_job.rb` (EE)

### lib (2)

- `lib/tasks/bulk_conversations.rake`
- `lib/tasks/ops/cleanup_orphan_conversations.rake`

### models (7)

- `app/models/concerns/conversation_mute_helpers.rb`
- `app/models/conversation.rb`
- `app/models/conversation_participant.rb`
- `app/models/mention.rb`
- `enterprise/app/models/conversation_outcome.rb` (EE)
- `enterprise/app/models/enterprise/concerns/conversation.rb` (EE)
- `enterprise/app/models/enterprise/conversation.rb` (EE)

### policies (2)

- `app/policies/conversation_policy.rb`
- `enterprise/app/policies/enterprise/conversation_policy.rb` (EE)

### presenters (2)

- `app/presenters/conversations/event_data_presenter.rb`
- `enterprise/app/presenters/enterprise/conversations/event_data_presenter.rb` (EE)

### services (12)

- `app/services/conversations/delete_service.rb`
- `app/services/conversations/sort_service.rb`
- `app/services/conversations/typing_status_manager.rb`
- `app/services/conversations/unread_counts.rb`
- `app/services/conversations/unread_counts/broadcast_scope.rb`
- `app/services/conversations/unread_counts/builder.rb`
- `app/services/conversations/unread_counts/counter.rb`
- `app/services/conversations/unread_counts/listener.rb`
- `app/services/conversations/unread_counts/refresher.rb`
- `app/services/conversations/unread_counts/store.rb`
- `app/services/conversations/unread_counts/store_keys.rb`
- `app/services/internal/remove_orphan_conversations_service.rb`

### views (15)

- `app/views/api/v1/accounts/conversations/create.json.jbuilder`
- `app/views/api/v1/accounts/conversations/index.json.jbuilder`
- `app/views/api/v1/accounts/conversations/meta.json.jbuilder`
- `app/views/api/v1/accounts/conversations/participants/create.json.jbuilder`
- `app/views/api/v1/accounts/conversations/participants/show.json.jbuilder`
- `app/views/api/v1/accounts/conversations/show.json.jbuilder`
- `app/views/api/v1/accounts/conversations/toggle_status.json.jbuilder`
- `app/views/api/v1/accounts/conversations/unread.json.jbuilder`
- `app/views/api/v1/accounts/conversations/update.json.jbuilder`
- `app/views/api/v1/accounts/conversations/update_last_seen.json.jbuilder`
- `app/views/api/v1/conversations/partials/_conversation.json.jbuilder`
- `app/views/api/v1/models/_conversation.json.jbuilder`
- `app/views/public/api/v1/models/_conversation.json.jbuilder`
- `enterprise/app/views/enterprise/api/v1/conversations/partials/_assignee.json.jbuilder` (EE)
- `enterprise/app/views/enterprise/api/v1/conversations/partials/_conversation.json.jbuilder` (EE)

## Ruby specs (33)

- `spec/builders/conversation_builder_spec.rb`
- `spec/controllers/api/v1/accounts/bulk_actions_controller_spec.rb`
- `spec/controllers/api/v1/accounts/conversations/participants_controller_spec.rb`
- `spec/controllers/api/v1/accounts/conversations_controller_spec.rb`
- `spec/controllers/public/api/v1/inbox/conversations_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/conversations_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/conversations_controller_spec.rb`
- `spec/enterprise/finders/conversation_finder_spec.rb`
- `spec/enterprise/jobs/enterprise/account/conversations_resolution_scheduler_job_spec.rb`
- `spec/enterprise/models/conversation_outcome_spec.rb`
- `spec/enterprise/models/conversation_spec.rb`
- `spec/enterprise/models/enterprise/conversation_spec.rb`
- `spec/enterprise/policies/conversation_policy_spec.rb`
- `spec/enterprise/presenters/conversations/event_data_presenter_spec.rb`
- `spec/enterprise/services/conversations/unread_counts/counter_spec.rb`
- `spec/finders/conversation_finder_spec.rb`
- `spec/jobs/account/conversations_resolution_scheduler_job_spec.rb`
- `spec/jobs/bulk_actions_job_spec.rb`
- `spec/jobs/conversation_reply_email_job_spec.rb`
- `spec/jobs/conversations/reopen_snoozed_conversations_job_spec.rb`
- `spec/jobs/conversations/resolution_job_spec.rb`
- `spec/jobs/migration/conversations_first_reply_scheduler_job_spec.rb`
- `spec/models/conversation_participants_spec.rb`
- `spec/models/conversation_spec.rb`
- `spec/models/mention_spec.rb`
- `spec/policies/conversation_policy_spec.rb`
- `spec/presenters/conversations/event_data_presenter_spec.rb`
- `spec/services/conversations/delete_service_spec.rb`
- `spec/services/conversations/unread_counts/builder_spec.rb`
- `spec/services/conversations/unread_counts/counter_spec.rb`
- `spec/services/conversations/unread_counts/listener_spec.rb`
- `spec/services/conversations/unread_counts/refresher_spec.rb`
- `spec/services/conversations/unread_counts/store_spec.rb`

## Frontend files (109)

- `app/javascript/dashboard/api/conversations.js`
- `app/javascript/dashboard/api/inbox/conversation.js`
- `app/javascript/dashboard/api/specs/conversations.spec.js`
- `app/javascript/dashboard/api/specs/inbox/conversation.spec.js`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardContent.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardPriorityIcon.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardStatusIcon.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationCard.story.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationCard.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationCardExpanded.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/UnreadBadge.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationRequiredEmpty.vue`
- `app/javascript/dashboard/components-next/Conversation/InboxName.vue`
- `app/javascript/dashboard/components-next/Conversation/ReferralBubble.story.vue`
- `app/javascript/dashboard/components-next/Conversation/ReferralBubble.vue`
- `app/javascript/dashboard/components-next/Conversation/SidepanelSwitch.vue`
- `app/javascript/dashboard/components-next/ConversationWorkflow/AttributeListItem.vue`
- `app/javascript/dashboard/components-next/ConversationWorkflow/ConversationRequiredAttributeItem.vue`
- `app/javascript/dashboard/components-next/ConversationWorkflow/ConversationRequiredAttributes.vue`
- `app/javascript/dashboard/components-next/ConversationWorkflow/ConversationResolveAttributesModal.vue`
- `app/javascript/dashboard/components-next/ConversationWorkflow/constants.js`
- `app/javascript/dashboard/components-next/NewConversation/ComposeConversation.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/ActionButtons.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/ComposeNewConversationForm.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/ContentTemplateForm.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/ContentTemplateSelector.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/EmailOptions.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/InboxEmptyState.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/InboxSelector.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/RecipientsInput.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/specs/EmailOptions.spec.js`
- `app/javascript/dashboard/components-next/NewConversation/components/specs/InboxSelector.spec.js`
- `app/javascript/dashboard/components-next/NewConversation/components/specs/RecipientsInput.spec.js`
- `app/javascript/dashboard/components-next/NewConversation/components/story/ComposeNewConversationForm.story.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/story/fixtures.js`
- `app/javascript/dashboard/components-next/NewConversation/helpers/composeConversationHelper.js`
- `app/javascript/dashboard/components-next/NewConversation/helpers/specs/composeConversationHelper.spec.js`
- `app/javascript/dashboard/components-next/sidebar/SidebarUnreadBadge.vue`
- `app/javascript/dashboard/components-next/year-in-review/slides/ConversationsSlide.vue`
- `app/javascript/dashboard/components/ChatList.vue`
- `app/javascript/dashboard/components/ChatListHeader.vue`
- `app/javascript/dashboard/components/ConversationItem.vue`
- `app/javascript/dashboard/components/ConversationList.vue`
- `app/javascript/dashboard/components/CustomSnoozeModal.vue`
- `app/javascript/dashboard/components/specs/ChatListHeader.spec.js`
- `app/javascript/dashboard/composables/chatlist/useBulkActions.js`
- `app/javascript/dashboard/composables/chatlist/useChatListKeyboardEvents.js`
- `app/javascript/dashboard/composables/commands/spec/useConversationHotKeys.spec.js`
- `app/javascript/dashboard/composables/commands/useConversationHotKeys.js`
- `app/javascript/dashboard/composables/spec/useConversationRequiredAttributes.spec.js`
- `app/javascript/dashboard/composables/spec/useConversationRoutePath.spec.js`
- `app/javascript/dashboard/composables/useConversationRequiredAttributes.js`
- `app/javascript/dashboard/composables/useConversationRoutePath.js`
- `app/javascript/dashboard/composables/useConversationSuggestions.js`
- `app/javascript/dashboard/helper/conversationHelper.js`
- `app/javascript/dashboard/helper/snoozeDateParser/index.js`
- `app/javascript/dashboard/helper/snoozeDateParser/localization.js`
- `app/javascript/dashboard/helper/snoozeDateParser/parser.js`
- `app/javascript/dashboard/helper/snoozeDateParser/suggestions.js`
- `app/javascript/dashboard/helper/snoozeDateParser/tokenMaps.js`
- `app/javascript/dashboard/helper/snoozeHelpers.js`
- `app/javascript/dashboard/helper/specs/conversationHelper.spec.js`
- `app/javascript/dashboard/helper/specs/fixtures/conversationFixtures.js`
- `app/javascript/dashboard/helper/specs/snoozeDateParser.spec.js`
- `app/javascript/dashboard/helper/specs/snoozeHelpers.spec.js`
- `app/javascript/dashboard/routes/dashboard/commands/CmdBarConversationSnooze.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/ConversationAction.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/ConversationInfo.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/ConversationParticipant.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/ConversationView.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/SharedFiles.vue`
- `app/javascript/dashboard/routes/dashboard/conversation/conversation.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/conversationWorkflow/conversationWorkflow.routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/conversationWorkflow/index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/LockToSingleConversationPreview.vue`
- `app/javascript/dashboard/store/modules/conversationMetadata.js`
- `app/javascript/dashboard/store/modules/conversationPage.js`
- `app/javascript/dashboard/store/modules/conversationTypingStatus.js`
- `app/javascript/dashboard/store/modules/conversationUnreadCounts.js`
- `app/javascript/dashboard/store/modules/conversationWatchers.js`
- `app/javascript/dashboard/store/modules/conversations/actions.js`
- `app/javascript/dashboard/store/modules/conversations/getters.js`
- `app/javascript/dashboard/store/modules/conversations/helpers.js`
- `app/javascript/dashboard/store/modules/conversations/helpers/actionHelpers.js`
- `app/javascript/dashboard/store/modules/conversations/helpers/specs/actionHelpers.spec.js`
- `app/javascript/dashboard/store/modules/conversations/index.js`
- `app/javascript/dashboard/store/modules/conversations/specs/helpers.spec.js`
- `app/javascript/dashboard/store/modules/conversations/specs/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationMetadata/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationMetadata/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationPage/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationPage/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationPage/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationTypingStatus/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationTypingStatus/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationTypingStatus/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationUnreadCounts/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationUnreadCounts/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationUnreadCounts/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationWatchers/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationWatchers/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/conversationWatchers/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversationWatchers/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversations/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversations/conversations.fixtures.js`
- `app/javascript/dashboard/store/modules/specs/conversations/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversations/helpers.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversations/mutations.spec.js`
- `app/javascript/dashboard/store/modules/specs/conversations/testConversationResponse.js`
