# Messages and attachments: coverage gaps

## Frontend: 92.3% (1828 of 1980 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/components-next/message/stories/MediaBubbles.story.vue` | 0.0% | 48 |
| `app/javascript/dashboard/components-next/message/stories/MessageBubbles.story.vue` | 0.0% | 28 |
| `app/javascript/dashboard/components-next/message/stories/TextMessages.story.vue` | 0.0% | 18 |
| `app/javascript/dashboard/components-next/message/stories/EmailMessages.story.vue` | 0.0% | 11 |
| `app/javascript/dashboard/components-next/message/bubbles/Unsupported.vue` | 46.7% | 8 |
| `app/javascript/dashboard/components-next/message/forward/ForwardEmailPanel.vue` | 91.6% | 7 |
| `app/javascript/dashboard/components-next/message/bubbles/BaseAttachment.vue` | 61.5% | 5 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/MessagePreview.vue` | 85.2% | 4 |
| `app/javascript/dashboard/components-next/message/provider.js` | 63.6% | 4 |
| `app/javascript/dashboard/components-next/NewConversation/components/MessageEditor.vue` | 72.7% | 3 |
| `app/javascript/dashboard/constants/editor.js` | 72.7% | 3 |
| `app/javascript/dashboard/components-next/message/bubbles/Audio.vue` | 60.0% | 2 |
| `app/javascript/dashboard/components-next/message/bubbles/Embed.vue` | 75.0% | 2 |
| `app/javascript/dashboard/components-next/message/chips/Video.vue` | 71.4% | 2 |
| `app/javascript/dashboard/routes/dashboard/settings/profile/AudioAlertCondition.vue` | 75.0% | 2 |
| `app/javascript/dashboard/components-next/message/MessageError.vue` | 91.7% | 1 |
| `app/javascript/dashboard/components-next/message/bubbles/Text/FormattedContent.vue` | 85.7% | 1 |
| `app/javascript/dashboard/helper/editorHelper.js` | 99.4% | 1 |
| `app/javascript/shared/components/GreetingsEditor.vue` | 85.7% | 1 |
| `app/javascript/shared/helpers/markdownIt/link.js` | 97.2% | 1 |

## Backend: 97.3% (1685 of 1732 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/models/message.rb` | 96.8% | 6 |
| `app/services/messages/markdown_renderers/base_markdown_renderer.rb` | 80.8% | 5 |
| `app/models/attachment.rb` | 95.4% | 4 |
| `app/services/messages/markdown_renderers/line_renderer.rb` | 80.0% | 4 |
| `app/services/messages/markdown_renderers/plain_text_renderer.rb` | 88.9% | 4 |
| `lib/safe_fetch/private_network_request.rb` | 92.9% | 4 |
| `app/services/message_templates/template/email_collect.rb` | 88.9% | 2 |
| `app/services/message_templates/template/greeting.rb` | 84.6% | 2 |
| `app/services/message_templates/template/out_of_office.rb` | 88.9% | 2 |
| `app/services/messages/markdown_renderers/whats_app_renderer.rb` | 93.3% | 2 |
| `enterprise/app/jobs/messages/audio_transcription_job.rb` | 80.0% | 2 |
| `enterprise/app/models/enterprise/message.rb` | 95.7% | 2 |
| `app/controllers/api/v1/accounts/conversations/messages_controller.rb` | 98.2% | 1 |
| `app/controllers/api/v1/accounts/upload_controller.rb` | 96.3% | 1 |
| `app/models/concerns/activity_message_handler.rb` | 98.5% | 1 |
| `app/models/concerns/content_attribute_validator.rb` | 97.0% | 1 |
| `app/services/messages/in_reply_to_message_builder.rb` | 92.3% | 1 |
| `app/services/messages/markdown_renderer_service.rb` | 98.4% | 1 |
| `enterprise/app/controllers/enterprise/api/v1/accounts/conversations/messages_controller.rb` | 96.6% | 1 |
| `lib/custom_markdown_renderer.rb` | 99.1% | 1 |
