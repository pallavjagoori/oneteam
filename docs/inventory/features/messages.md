# Messages and attachments

**Area:** Conversations

Sending and receiving messages, attachments and uploads, message templates, reply-to, translations, markdown rendering and content safety.

**Feature flags:** `message_reply_to`, `auto_translate`

## HTTP routes (23)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/conversations/:conversation_id/messages/:id/retry(.:format)` | `api/v1/accounts/conversations/messages#retry` |
| GET | `/api/v1/accounts/:account_id/conversations/:conversation_id/messages(.:format)` | `api/v1/accounts/conversations/messages#index` |
| POST | `/api/v1/accounts/:account_id/conversations/:conversation_id/messages(.:format)` | `api/v1/accounts/conversations/messages#create` |
| PATCH | `/api/v1/accounts/:account_id/conversations/:conversation_id/messages/:id(.:format)` | `api/v1/accounts/conversations/messages#update` |
| PUT | `/api/v1/accounts/:account_id/conversations/:conversation_id/messages/:id(.:format)` | `api/v1/accounts/conversations/messages#update` |
| DELETE | `/api/v1/accounts/:account_id/conversations/:conversation_id/messages/:id(.:format)` | `api/v1/accounts/conversations/messages#destroy` |
| POST | `/api/v1/accounts/:account_id/conversations/:conversation_id/direct_uploads(.:format)` | `api/v1/accounts/conversations/direct_uploads#create` |
| GET | `/api/v1/accounts/:account_id/conversations/:conversation_id/draft_messages(.:format)` | `api/v1/accounts/conversations/draft_messages#show` |
| PATCH | `/api/v1/accounts/:account_id/conversations/:conversation_id/draft_messages(.:format)` | `api/v1/accounts/conversations/draft_messages#update` |
| PUT | `/api/v1/accounts/:account_id/conversations/:conversation_id/draft_messages(.:format)` | `api/v1/accounts/conversations/draft_messages#update` |
| DELETE | `/api/v1/accounts/:account_id/conversations/:conversation_id/draft_messages(.:format)` | `api/v1/accounts/conversations/draft_messages#destroy` |
| GET | `/api/v1/accounts/:account_id/conversations/:id/attachments(.:format)` | `api/v1/accounts/conversations#attachments` |
| GET | `/api/v1/accounts/:account_id/inboxes/:id/message_templates(.:format)` | `api/v1/accounts/inboxes#message_templates` |
| POST | `/api/v1/accounts/:account_id/upload(.:format)` | `api/v1/accounts/upload#create` |
| GET | `/rails/active_storage/blobs/redirect/:signed_id/*filename(.:format)` | `active_storage/blobs/redirect#show` |
| GET | `/rails/active_storage/blobs/proxy/:signed_id/*filename(.:format)` | `active_storage/blobs/proxy#show` |
| GET | `/rails/active_storage/blobs/:signed_id/*filename(.:format)` | `active_storage/blobs/redirect#show` |
| GET | `/rails/active_storage/representations/redirect/:signed_blob_id/:variation_key/*filename(.:format)` | `active_storage/representations/redirect#show` |
| GET | `/rails/active_storage/representations/proxy/:signed_blob_id/:variation_key/*filename(.:format)` | `active_storage/representations/proxy#show` |
| GET | `/rails/active_storage/representations/:signed_blob_id/:variation_key/*filename(.:format)` | `active_storage/representations/redirect#show` |
| GET | `/rails/active_storage/disk/:encoded_key/*filename(.:format)` | `active_storage/disk#show` |
| PUT | `/rails/active_storage/disk/:encoded_token(.:format)` | `active_storage/disk#update` |
| POST | `/rails/active_storage/direct_uploads(.:format)` | `active_storage/direct_uploads#create` |

## Database tables (5)

`active_storage_attachments`, `active_storage_blobs`, `active_storage_variant_records`, `attachments`, `messages`

## Backend files (61)

### builders (2)

- `app/builders/messages/message_builder.rb`
- `enterprise/app/builders/enterprise/messages/message_builder.rb` (EE)

### controllers (6)

- `app/controllers/api/v1/accounts/conversations/direct_uploads_controller.rb`
- `app/controllers/api/v1/accounts/conversations/draft_messages_controller.rb`
- `app/controllers/api/v1/accounts/conversations/messages_controller.rb`
- `app/controllers/api/v1/accounts/upload_controller.rb`
- `app/controllers/concerns/attachment_concern.rb`
- `enterprise/app/controllers/enterprise/api/v1/accounts/conversations/messages_controller.rb` (EE)

### finders (2)

- `app/finders/message_finder.rb`
- `enterprise/app/finders/enterprise/message_finder.rb` (EE)

### helpers (1)

- `app/helpers/message_format_helper.rb`

### jobs (4)

- `app/jobs/conversations/activity_message_job.rb`
- `app/jobs/conversations/update_message_status_job.rb`
- `app/jobs/send_reply_job.rb`
- `enterprise/app/jobs/messages/audio_transcription_job.rb` (EE)

### lib (10)

- `lib/active_storage/migrator.rb`
- `lib/base_markdown_renderer.rb`
- `lib/chatwoot_markdown_renderer.rb`
- `lib/custom_exceptions/invalid_announcement_audio.rb`
- `lib/custom_markdown_renderer.rb`
- `lib/markdown_renderer_url_sanitizer.rb`
- `lib/safe_fetch.rb`
- `lib/safe_fetch/fetcher.rb`
- `lib/safe_fetch/private_network_request.rb`
- `lib/safe_fetch/request_options.rb`

### models (10)

- `app/models/attachment.rb`
- `app/models/concerns/activity_message_handler.rb`
- `app/models/concerns/assignee_activity_message_handler.rb`
- `app/models/concerns/content_attribute_validator.rb`
- `app/models/concerns/priority_activity_message_handler.rb`
- `app/models/message.rb`
- `enterprise/app/models/enterprise/activity_message_handler.rb` (EE)
- `enterprise/app/models/enterprise/concerns/attachment.rb` (EE)
- `enterprise/app/models/enterprise/concerns/message.rb` (EE)
- `enterprise/app/models/enterprise/message.rb` (EE)

### presenters (1)

- `app/presenters/message_content_presenter.rb`

### services (15)

- `app/services/conversations/message_window_service.rb`
- `app/services/message_templates/template/auto_resolve.rb`
- `app/services/message_templates/template/email_collect.rb`
- `app/services/message_templates/template/greeting.rb`
- `app/services/message_templates/template/out_of_office.rb`
- `app/services/messages/in_reply_to_message_builder.rb`
- `app/services/messages/markdown_renderer_service.rb`
- `app/services/messages/markdown_renderers/base_markdown_renderer.rb`
- `app/services/messages/markdown_renderers/line_renderer.rb`
- `app/services/messages/markdown_renderers/plain_text_renderer.rb`
- `app/services/messages/markdown_renderers/whats_app_renderer.rb`
- `app/services/messages/mention_service.rb`
- `app/services/messages/status_update_service.rb`
- `enterprise/app/services/messages/audio_transcription_service.rb` (EE)
- `enterprise/app/services/messages/reindex_service.rb` (EE)

### views (10)

- `app/views/api/v1/accounts/conversations/attachments.json.jbuilder`
- `app/views/api/v1/accounts/conversations/messages/create.json.jbuilder`
- `app/views/api/v1/accounts/conversations/messages/destroy.json.jbuilder`
- `app/views/api/v1/accounts/conversations/messages/index.json.jbuilder`
- `app/views/api/v1/accounts/conversations/messages/retry.json.jbuilder`
- `app/views/api/v1/accounts/conversations/messages/update.json.jbuilder`
- `app/views/api/v1/models/_attachment.json.jbuilder`
- `app/views/api/v1/models/_message.json.jbuilder`
- `app/views/api/v1/models/_widget_message.json.jbuilder`
- `app/views/public/api/v1/models/_message.json.jbuilder`

## Ruby specs (34)

- `spec/builders/messages/message_builder_spec.rb`
- `spec/config/markdown_embeds_spec.rb`
- `spec/controllers/api/v1/accounts/conversations/direct_uploads_controller_spec.rb`
- `spec/controllers/api/v1/accounts/conversations/draft_messages_controller_spec.rb`
- `spec/controllers/api/v1/accounts/conversations/messages_controller_spec.rb`
- `spec/controllers/api/v1/upload_controller_spec.rb`
- `spec/controllers/public/api/v1/inbox/messages_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/conversations/messages_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/conversations/messages_controller_spec.rb`
- `spec/enterprise/jobs/messages/audio_transcription_job_spec.rb`
- `spec/enterprise/jobs/send_reply_job_spec.rb`
- `spec/enterprise/models/message_spec.rb`
- `spec/enterprise/services/messages/audio_transcription_service_spec.rb`
- `spec/finders/message_finder_spec.rb`
- `spec/helpers/message_format_helper_spec.rb`
- `spec/jobs/conversations/update_message_status_job_spec.rb`
- `spec/jobs/send_reply_job_spec.rb`
- `spec/lib/active_storage/migrator_spec.rb`
- `spec/lib/base_markdown_renderer_spec.rb`
- `spec/lib/chatwoot_markdown_renderer_editor_output_spec.rb`
- `spec/lib/chatwoot_markdown_renderer_spec.rb`
- `spec/lib/custom_markdown_renderer_spec.rb`
- `spec/lib/safe_fetch_spec.rb`
- `spec/models/attachment_spec.rb`
- `spec/models/message_spec.rb`
- `spec/presenters/message_content_presenter_spec.rb`
- `spec/requests/active_storage/direct_uploads_spec.rb`
- `spec/services/conversations/message_window_service_spec.rb`
- `spec/services/message_templates/template/email_collect_spec.rb`
- `spec/services/message_templates/template/greeting_spec.rb`
- `spec/services/message_templates/template/out_of_office_spec.rb`
- `spec/services/messages/markdown_renderer_service_spec.rb`
- `spec/services/messages/mention_service_spec.rb`
- `spec/services/messages/status_update_service_spec.rb`

## Frontend files (106)

- `app/javascript/dashboard/api/inbox/message.js`
- `app/javascript/dashboard/api/specs/inbox/message.spec.js`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardMessagePreview.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/CardMessagePreviewWithMeta.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/MessagePreview.vue`
- `app/javascript/dashboard/components-next/Editor/Editor.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/AttachmentPreviews.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/MessageEditor.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/specs/MessageEditor.spec.js`
- `app/javascript/dashboard/components-next/SharedAttachments/Files.vue`
- `app/javascript/dashboard/components-next/SharedAttachments/Media.vue`
- `app/javascript/dashboard/components-next/audio/AudioPlayer.vue`
- `app/javascript/dashboard/components-next/message/Message.vue`
- `app/javascript/dashboard/components-next/message/MessageError.vue`
- `app/javascript/dashboard/components-next/message/MessageList.vue`
- `app/javascript/dashboard/components-next/message/MessageMeta.vue`
- `app/javascript/dashboard/components-next/message/MessageStatus.vue`
- `app/javascript/dashboard/components-next/message/TranslationToggle.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Activity.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Audio.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Base.vue`
- `app/javascript/dashboard/components-next/message/bubbles/BaseAttachment.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Embed.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Fallback.vue`
- `app/javascript/dashboard/components-next/message/bubbles/File.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Form.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Image.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Location.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Text/FormattedContent.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Text/Index.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Unsupported.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Video.vue`
- `app/javascript/dashboard/components-next/message/bubbles/specs/Activity.spec.js`
- `app/javascript/dashboard/components-next/message/chips/AttachmentChips.vue`
- `app/javascript/dashboard/components-next/message/chips/Audio.vue`
- `app/javascript/dashboard/components-next/message/chips/File.vue`
- `app/javascript/dashboard/components-next/message/chips/Image.vue`
- `app/javascript/dashboard/components-next/message/chips/Video.vue`
- `app/javascript/dashboard/components-next/message/constants.js`
- `app/javascript/dashboard/components-next/message/fixtures/emailConversation.js`
- `app/javascript/dashboard/components-next/message/fixtures/newsletterEmail.js`
- `app/javascript/dashboard/components-next/message/fixtures/simpleEmail.js`
- `app/javascript/dashboard/components-next/message/fixtures/textOnly.js`
- `app/javascript/dashboard/components-next/message/fixtures/textWithMedia.js`
- `app/javascript/dashboard/components-next/message/forward/EditableEmailBody.vue`
- `app/javascript/dashboard/components-next/message/forward/ForwardEmailPanel.vue`
- `app/javascript/dashboard/components-next/message/forward/ForwardedEmailBanner.vue`
- `app/javascript/dashboard/components-next/message/forward/specs/EditableEmailBody.spec.js`
- `app/javascript/dashboard/components-next/message/forward/specs/ForwardEmailPanel.spec.js`
- `app/javascript/dashboard/components-next/message/forward/specs/ForwardedEmailBanner.spec.js`
- `app/javascript/dashboard/components-next/message/provider.js`
- `app/javascript/dashboard/components-next/message/specs/TranslationToggle.spec.js`
- `app/javascript/dashboard/components-next/message/stories/EmailMessages.story.vue`
- `app/javascript/dashboard/components-next/message/stories/MediaBubbles.story.vue`
- `app/javascript/dashboard/components-next/message/stories/MessageBubbles.story.vue`
- `app/javascript/dashboard/components-next/message/stories/TextMessages.story.vue`
- `app/javascript/dashboard/composables/spec/useFileUpload.spec.js`
- `app/javascript/dashboard/composables/spec/useTranslations.spec.js`
- `app/javascript/dashboard/composables/useFileUpload.js`
- `app/javascript/dashboard/composables/useTranslations.js`
- `app/javascript/dashboard/constants/editor.js`
- `app/javascript/dashboard/helper/AudioAlerts/AudioMessageHelper.js`
- `app/javascript/dashboard/helper/AudioAlerts/WindowVisibilityHelper.js`
- `app/javascript/dashboard/helper/AudioAlerts/faviconHelper.js`
- `app/javascript/dashboard/helper/AudioAlerts/specs/AudioMessageHelper.spec.js`
- `app/javascript/dashboard/helper/AudioAlerts/specs/WindowVisibilityHelper.spec.js`
- `app/javascript/dashboard/helper/directUploadsHelper.js`
- `app/javascript/dashboard/helper/editorHelper.js`
- `app/javascript/dashboard/helper/markdownEmbeds.js`
- `app/javascript/dashboard/helper/specs/directUploadsHelper.spec.js`
- `app/javascript/dashboard/helper/specs/editorContentHelper.spec.js`
- `app/javascript/dashboard/helper/specs/editorHelper.spec.js`
- `app/javascript/dashboard/helper/specs/uploadHelper.spec.js`
- `app/javascript/dashboard/helper/translationProvider.js`
- `app/javascript/dashboard/helper/uploadHelper.js`
- `app/javascript/dashboard/mixins/fileUploadMixin.js`
- `app/javascript/dashboard/mixins/specs/fileUploadMixin.spec.js`
- `app/javascript/dashboard/modules/conversations/components/MessageContextMenu.vue`
- `app/javascript/dashboard/modules/conversations/components/specs/MessageContextMenu.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/account/components/AudioTranscription.vue`
- `app/javascript/dashboard/routes/dashboard/settings/account/components/Translation.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/AudioAlertCondition.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/AudioAlertEvent.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/AudioAlertTone.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/MessageSignature.vue`
- `app/javascript/dashboard/store/modules/conversations/actions/messageReadActions.js`
- `app/javascript/dashboard/store/modules/draftMessages.js`
- `app/javascript/dashboard/store/modules/specs/draftMessages/actions.spec.js`
- `app/javascript/dashboard/store/modules/specs/draftMessages/fixtures.js`
- `app/javascript/dashboard/store/modules/specs/draftMessages/getters.spec.js`
- `app/javascript/dashboard/store/modules/specs/draftMessages/mutations.spec.js`
- `app/javascript/shared/assets/audio/bell.mp3`
- `app/javascript/shared/assets/audio/ding.mp3`
- `app/javascript/shared/components/GreetingsEditor.vue`
- `app/javascript/shared/composables/specs/useMessageFormatter.spec.js`
- `app/javascript/shared/composables/useMessageFormatter.js`
- `app/javascript/shared/constants/messages.js`
- `app/javascript/shared/helpers/HTMLSanitizer.js`
- `app/javascript/shared/helpers/MessageFormatter.js`
- `app/javascript/shared/helpers/MessageTypeHelper.js`
- `app/javascript/shared/helpers/markdownIt/link.js`
- `app/javascript/shared/helpers/sanitizeData.js`
- `app/javascript/shared/helpers/specs/HTMLSanitizer.spec.js`
- `app/javascript/shared/helpers/specs/MessageFormatter.spec.js`
- `app/javascript/shared/helpers/specs/MessageTypeHelper.spec.js`
- `app/javascript/shared/helpers/specs/sanitizeData.spec.js`
