# Conversations: coverage gaps

## Frontend: 50.3% (1753 of 3482 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/components/ChatList.vue` | 0.0% | 355 |
| `app/javascript/dashboard/components-next/NewConversation/components/ComposeNewConversationForm.vue` | 2.4% | 124 |
| `app/javascript/dashboard/components-next/NewConversation/ComposeConversation.vue` | 0.0% | 105 |
| `app/javascript/dashboard/routes/dashboard/conversation/ConversationAction.vue` | 3.8% | 100 |
| `app/javascript/dashboard/components/ConversationItem.vue` | 0.0% | 95 |
| `app/javascript/dashboard/composables/chatlist/useBulkActions.js` | 0.0% | 83 |
| `app/javascript/dashboard/components-next/ConversationWorkflow/ConversationResolveAttributesModal.vue` | 3.9% | 73 |
| `app/javascript/dashboard/components-next/NewConversation/components/ActionButtons.vue` | 4.2% | 69 |
| `app/javascript/dashboard/components-next/ConversationWorkflow/ConversationRequiredAttributes.vue` | 8.5% | 54 |
| `app/javascript/dashboard/store/modules/conversations/actions.js` | 74.9% | 54 |
| `app/javascript/dashboard/routes/dashboard/conversation/ConversationView.vue` | 3.9% | 49 |
| `app/javascript/dashboard/routes/dashboard/conversation/ConversationParticipant.vue` | 13.7% | 44 |
| `app/javascript/dashboard/composables/useConversationSuggestions.js` | 2.8% | 35 |
| `app/javascript/dashboard/components-next/NewConversation/components/ContentTemplateSelector.vue` | 13.9% | 31 |
| `app/javascript/dashboard/components-next/year-in-review/slides/ConversationsSlide.vue` | 0.0% | 31 |
| `app/javascript/dashboard/store/modules/conversations/getters.js` | 71.6% | 31 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationCard.vue` | 16.7% | 30 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationCardExpanded.vue` | 3.6% | 27 |
| `app/javascript/dashboard/routes/dashboard/commands/CmdBarConversationSnooze.vue` | 0.0% | 27 |
| `app/javascript/dashboard/routes/dashboard/conversation/ConversationInfo.vue` | 7.1% | 26 |
| `app/javascript/dashboard/components-next/Conversation/ReferralBubble.vue` | 27.3% | 24 |
| `app/javascript/dashboard/components-next/NewConversation/components/story/ComposeNewConversationForm.story.vue` | 0.0% | 22 |
| `app/javascript/dashboard/components/ConversationList.vue` | 0.0% | 20 |
| `app/javascript/dashboard/routes/dashboard/conversation/SharedFiles.vue` | 13.0% | 20 |
| `app/javascript/dashboard/components-next/Conversation/SidepanelSwitch.vue` | 0.0% | 18 |
| `app/javascript/dashboard/composables/chatlist/useChatListKeyboardEvents.js` | 0.0% | 18 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationCard.story.vue` | 0.0% | 16 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardPriorityIcon.vue` | 0.0% | 15 |
| `app/javascript/dashboard/store/modules/conversations/index.js` | 90.6% | 15 |
| `app/javascript/dashboard/composables/commands/useConversationHotKeys.js` | 86.9% | 13 |
| `app/javascript/dashboard/components/CustomSnoozeModal.vue` | 21.4% | 11 |
| `app/javascript/dashboard/routes/dashboard/settings/conversationWorkflow/index.vue` | 8.3% | 11 |
| `app/javascript/dashboard/components/ChatListHeader.vue` | 66.7% | 10 |
| `app/javascript/dashboard/components-next/Conversation/ReferralBubble.story.vue` | 0.0% | 10 |
| `app/javascript/dashboard/components-next/ConversationWorkflow/AttributeListItem.vue` | 59.1% | 9 |
| `app/javascript/dashboard/components-next/ConversationWorkflow/ConversationRequiredAttributeItem.vue` | 50.0% | 8 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardStatusIcon.vue` | 0.0% | 7 |
| `app/javascript/dashboard/components-next/NewConversation/components/ContentTemplateForm.vue` | 30.0% | 7 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/UnreadBadge.vue` | 16.7% | 5 |
| `app/javascript/dashboard/store/modules/conversations/helpers.js` | 93.9% | 5 |
| `app/javascript/dashboard/components-next/NewConversation/components/story/fixtures.js` | 0.0% | 4 |
| `app/javascript/dashboard/components-next/NewConversation/components/InboxSelector.vue` | 76.9% | 3 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/LockToSingleConversationPreview.vue` | 25.0% | 3 |
| `app/javascript/dashboard/components-next/NewConversation/components/InboxEmptyState.vue` | 50.0% | 2 |
| `app/javascript/dashboard/store/modules/conversationTypingStatus.js` | 89.5% | 2 |
| `app/javascript/dashboard/store/modules/conversations/helpers/actionHelpers.js` | 93.3% | 2 |
| `app/javascript/dashboard/components-next/Conversation/ConversationRequiredEmpty.vue` | 75.0% | 1 |
| `app/javascript/dashboard/components-next/Conversation/InboxName.vue` | 66.7% | 1 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardContent.vue` | 0.0% | 1 |
| `app/javascript/dashboard/components-next/NewConversation/components/EmailOptions.vue` | 96.4% | 1 |
| `app/javascript/dashboard/components-next/NewConversation/helpers/composeConversationHelper.js` | 98.7% | 1 |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 99.7% | 1 |

## Backend: 90.1% (1379 of 1531 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `lib/tasks/bulk_conversations.rake` | 13.7% | 63 |
| `app/services/internal/remove_orphan_conversations_service.rb` | 0.0% | 26 |
| `app/controllers/api/v1/accounts/conversations/suggestions_controller.rb` | 0.0% | 18 |
| `lib/tasks/ops/cleanup_orphan_conversations.rake` | 18.2% | 18 |
| `app/jobs/internal/remove_orphan_conversations_job.rb` | 0.0% | 6 |
| `app/jobs/conversations/user_mention_job.rb` | 37.5% | 5 |
| `enterprise/app/controllers/enterprise/api/v1/accounts/conversations_controller.rb` | 66.7% | 5 |
| `app/finders/conversation_finder.rb` | 97.9% | 2 |
| `app/services/conversations/unread_counts/builder.rb` | 94.6% | 2 |
| `app/services/conversations/unread_counts/counter.rb` | 98.2% | 2 |
| `app/models/conversation.rb` | 99.5% | 1 |
| `app/services/conversations/typing_status_manager.rb` | 92.3% | 1 |
| `app/services/conversations/unread_counts/refresher.rb` | 98.9% | 1 |
| `enterprise/app/finders/enterprise/conversation_finder.rb` | 75.0% | 1 |
| `enterprise/app/models/enterprise/concerns/conversation.rb` | 97.1% | 1 |
