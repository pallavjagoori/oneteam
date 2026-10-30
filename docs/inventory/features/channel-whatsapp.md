# WhatsApp

**Area:** Channels

WhatsApp Cloud API and 360dialog inboxes: embedded signup, templates, incoming webhooks, sending, and WhatsApp calling.

**Feature flags:** `whatsapp_embedded_signup`, `whatsapp_campaign`, `whatsapp_manual_transfer`, `whatsapp_reconfigure`, `whatsapp_embedded_signup_inbox_creation`

## HTTP routes (17)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/whatsapp_calls/:id/accept(.:format)` | `api/v1/accounts/whatsapp_calls#accept` |
| POST | `/api/v1/accounts/:account_id/whatsapp_calls/:id/reject(.:format)` | `api/v1/accounts/whatsapp_calls#reject` |
| POST | `/api/v1/accounts/:account_id/whatsapp_calls/:id/terminate(.:format)` | `api/v1/accounts/whatsapp_calls#terminate` |
| POST | `/api/v1/accounts/:account_id/whatsapp_calls/:id/upload_recording(.:format)` | `api/v1/accounts/whatsapp_calls#upload_recording` |
| POST | `/api/v1/accounts/:account_id/whatsapp_calls/initiate(.:format)` | `api/v1/accounts/whatsapp_calls#initiate` |
| GET | `/api/v1/accounts/:account_id/whatsapp_calls/:id(.:format)` | `api/v1/accounts/whatsapp_calls#show` |
| PUT | `/api/v1/accounts/:account_id/inboxes/:id/whatsapp_business_management_token(.:format)` | `api/v1/accounts/inboxes#whatsapp_business_management_token` |
| POST | `/api/v1/accounts/:account_id/inboxes/:id/enable_whatsapp_calling(.:format)` | `api/v1/accounts/inboxes#enable_whatsapp_calling` |
| POST | `/api/v1/accounts/:account_id/inboxes/:id/disable_whatsapp_calling(.:format)` | `api/v1/accounts/inboxes#disable_whatsapp_calling` |
| POST | `/api/v1/accounts/:account_id/whatsapp/authorization(.:format)` | `api/v1/accounts/whatsapp/authorizations#create` |
| POST | `/api/v1/accounts/:account_id/whatsapp/access_request(.:format)` | `api/v1/accounts/whatsapp/access_requests#create` |
| POST | `/api/v1/accounts/:account_id/whatsapp/manual/preview(.:format)` | `api/v1/accounts/whatsapp/manual_setup#preview` |
| POST | `/api/v1/accounts/:account_id/whatsapp/manual/connect(.:format)` | `api/v1/accounts/whatsapp/manual_setup#connect` |
| GET | `/api/v1/accounts/:account_id/whatsapp/manual/:inbox_id/webhook_status(.:format)` | `api/v1/accounts/whatsapp/manual_setup#webhook_status` |
| POST | `/api/v1/accounts/:account_id/whatsapp/manual/:inbox_id/setup_webhook(.:format)` | `api/v1/accounts/whatsapp/manual_setup#setup_webhook` |
| GET | `/webhooks/whatsapp/:phone_number(.:format)` | `webhooks/whatsapp#verify` |
| POST | `/webhooks/whatsapp/:phone_number(.:format)` | `webhooks/whatsapp#process_payload` |

## Database tables (1)

`channel_whatsapp`

## Backend files (85)

### controllers (5)

- `app/controllers/api/v1/accounts/whatsapp/authorizations_controller.rb`
- `app/controllers/api/v1/accounts/whatsapp/manual_setup_controller.rb`
- `app/controllers/webhooks/whatsapp_controller.rb`
- `enterprise/app/controllers/api/v1/accounts/whatsapp/access_requests_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/whatsapp_calls_controller.rb` (EE)

### jobs (8)

- `app/jobs/campaigns/send_whatsapp_batch_job.rb`
- `app/jobs/channels/whatsapp/health_sync_job.rb`
- `app/jobs/channels/whatsapp/health_sync_scheduler_job.rb`
- `app/jobs/channels/whatsapp/templates_sync_job.rb`
- `app/jobs/channels/whatsapp/templates_sync_scheduler_job.rb`
- `app/jobs/webhooks/whatsapp_events_job.rb`
- `enterprise/app/jobs/campaigns/recover_whatsapp_campaigns_job.rb` (EE)
- `enterprise/app/jobs/enterprise/webhooks/whatsapp_events_job.rb` (EE)

### lib (1)

- `lib/custom_exceptions/whatsapp_contact_info_request_error.rb`

### models (2)

- `app/models/channel/whatsapp.rb`
- `enterprise/app/models/enterprise/channel/whatsapp.rb` (EE)

### services (60)

- `app/services/twilio/whatsapp_identifier_helper.rb`
- `app/services/whatsapp/authentication_template_guard.rb`
- `app/services/whatsapp/business_management_token_service.rb`
- `app/services/whatsapp/business_management_token_validation_service.rb`
- `app/services/whatsapp/business_profile_service.rb`
- `app/services/whatsapp/channel_creation_service.rb`
- `app/services/whatsapp/contact_info_request_eligibility_service.rb`
- `app/services/whatsapp/contact_info_request_service.rb`
- `app/services/whatsapp/contact_info_response_service.rb`
- `app/services/whatsapp/csat_template_service.rb`
- `app/services/whatsapp/embedded_signup_service.rb`
- `app/services/whatsapp/facebook_api_client.rb`
- `app/services/whatsapp/health_service.rb`
- `app/services/whatsapp/identifier_sync_service.rb`
- `app/services/whatsapp/identity_source_id_orderer.rb`
- `app/services/whatsapp/in_reply_to_message_finder.rb`
- `app/services/whatsapp/incoming_contact_message_handler.rb`
- `app/services/whatsapp/incoming_message_base_service.rb`
- `app/services/whatsapp/incoming_message_identifier_helper.rb`
- `app/services/whatsapp/incoming_message_service.rb`
- `app/services/whatsapp/incoming_message_service_helpers.rb`
- `app/services/whatsapp/incoming_message_whatsapp_cloud_service.rb`
- `app/services/whatsapp/liquid_template_processor_service.rb`
- `app/services/whatsapp/manual_setup_service.rb`
- `app/services/whatsapp/manual_setup_validation_service.rb`
- `app/services/whatsapp/manual_webhook_status_service.rb`
- `app/services/whatsapp/media_upload_service.rb`
- `app/services/whatsapp/message_dedup_lock.rb`
- `app/services/whatsapp/oneoff_campaign_service.rb`
- `app/services/whatsapp/phone_info_service.rb`
- `app/services/whatsapp/phone_normalizers/argentina_phone_normalizer.rb`
- `app/services/whatsapp/phone_normalizers/base_phone_normalizer.rb`
- `app/services/whatsapp/phone_normalizers/brazil_phone_normalizer.rb`
- `app/services/whatsapp/phone_normalizers/mexico_phone_normalizer.rb`
- `app/services/whatsapp/phone_number_normalization_service.rb`
- `app/services/whatsapp/populate_template_parameters_service.rb`
- `app/services/whatsapp/providers/base_service.rb`
- `app/services/whatsapp/providers/whatsapp_360_dialog_service.rb`
- `app/services/whatsapp/providers/whatsapp_cloud_contact_info_request_service.rb`
- `app/services/whatsapp/providers/whatsapp_cloud_service.rb`
- `app/services/whatsapp/reauthorization_service.rb`
- `app/services/whatsapp/send_on_whatsapp_service.rb`
- `app/services/whatsapp/template_content_renderer_service.rb`
- `app/services/whatsapp/template_parameter_converter_service.rb`
- `app/services/whatsapp/template_processor_service.rb`
- `app/services/whatsapp/token_exchange_service.rb`
- `app/services/whatsapp/user_id_rotation_service.rb`
- `app/services/whatsapp/webhook_channel_finder_service.rb`
- `app/services/whatsapp/webhook_setup_service.rb`
- `app/services/whatsapp/webhook_teardown_service.rb`
- `enterprise/app/services/enterprise/whatsapp/incoming_message_base_service.rb` (EE)
- `enterprise/app/services/enterprise/whatsapp/oneoff_campaign_service.rb` (EE)
- `enterprise/app/services/enterprise/whatsapp/providers/base_service.rb` (EE)
- `enterprise/app/services/enterprise/whatsapp/providers/whatsapp_cloud_service.rb` (EE)
- `enterprise/app/services/whatsapp/call_conversation_builder.rb` (EE)
- `enterprise/app/services/whatsapp/call_permission_reply_service.rb` (EE)
- `enterprise/app/services/whatsapp/call_permission_request_service.rb` (EE)
- `enterprise/app/services/whatsapp/call_service.rb` (EE)
- `enterprise/app/services/whatsapp/inbound_call_identity_builder.rb` (EE)
- `enterprise/app/services/whatsapp/incoming_call_service.rb` (EE)

### views (9)

- `app/views/api/v1/accounts/whatsapp/callbacks/embedded_signup.json.jbuilder`
- `app/views/mailers/administrator_notifications/channel_notifications_mailer/whatsapp_disconnect.liquid`
- `enterprise/app/views/api/v1/accounts/whatsapp_calls/accept.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/whatsapp_calls/initiate.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/whatsapp_calls/reject.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/whatsapp_calls/show.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/whatsapp_calls/terminate.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/accounts/whatsapp_calls/upload_recording.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/_whatsapp_call.json.jbuilder` (EE)

## Ruby specs (55)

- `spec/controllers/api/v1/accounts/whatsapp/authorizations_controller_spec.rb`
- `spec/controllers/api/v1/accounts/whatsapp_business_management_token_spec.rb`
- `spec/controllers/webhooks/whatsapp_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/whatsapp_calls_controller_spec.rb`
- `spec/enterprise/jobs/campaigns/recover_whatsapp_campaigns_job_spec.rb`
- `spec/enterprise/services/enterprise/whatsapp/incoming_message_base_service_spec.rb`
- `spec/enterprise/services/enterprise/whatsapp/oneoff_campaign_service_spec.rb`
- `spec/enterprise/services/enterprise/whatsapp/providers/base_service_spec.rb`
- `spec/enterprise/services/enterprise/whatsapp/providers/whatsapp_cloud_service_spec.rb`
- `spec/enterprise/services/whatsapp/call_permission_reply_service_spec.rb`
- `spec/enterprise/services/whatsapp/call_permission_request_service_spec.rb`
- `spec/enterprise/services/whatsapp/call_service_spec.rb`
- `spec/enterprise/services/whatsapp/inbound_call_identity_builder_spec.rb`
- `spec/enterprise/services/whatsapp/incoming_call_service_spec.rb`
- `spec/jobs/campaigns/send_whatsapp_batch_job_spec.rb`
- `spec/jobs/channels/whatsapp/health_sync_job_spec.rb`
- `spec/jobs/channels/whatsapp/health_sync_scheduler_job_spec.rb`
- `spec/jobs/channels/whatsapp/templates_sync_job_spec.rb`
- `spec/jobs/channels/whatsapp/templates_sync_scheduler_job_spec.rb`
- `spec/jobs/webhooks/whatsapp_events_job_spec.rb`
- `spec/models/channel/whatsapp_spec.rb`
- `spec/services/whatsapp/authentication_template_guard_spec.rb`
- `spec/services/whatsapp/business_management_token_service_spec.rb`
- `spec/services/whatsapp/business_management_token_validation_service_spec.rb`
- `spec/services/whatsapp/business_profile_service_spec.rb`
- `spec/services/whatsapp/channel_creation_service_spec.rb`
- `spec/services/whatsapp/contact_info_request_eligibility_service_spec.rb`
- `spec/services/whatsapp/contact_info_response_service_spec.rb`
- `spec/services/whatsapp/csat_template_service_spec.rb`
- `spec/services/whatsapp/embedded_signup_service_spec.rb`
- `spec/services/whatsapp/facebook_api_client_spec.rb`
- `spec/services/whatsapp/health_service_spec.rb`
- `spec/services/whatsapp/identifier_sync_service_spec.rb`
- `spec/services/whatsapp/in_reply_to_message_finder_spec.rb`
- `spec/services/whatsapp/incoming_message_service_spec.rb`
- `spec/services/whatsapp/incoming_message_whatsapp_cloud_service_spec.rb`
- `spec/services/whatsapp/liquid_template_processor_service_spec.rb`
- `spec/services/whatsapp/media_upload_service_spec.rb`
- `spec/services/whatsapp/message_dedup_lock_spec.rb`
- `spec/services/whatsapp/oneoff_campaign_service_spec.rb`
- `spec/services/whatsapp/phone_info_service_spec.rb`
- `spec/services/whatsapp/phone_normalizers/brazil_phone_normalizer_spec.rb`
- `spec/services/whatsapp/phone_normalizers/mexico_phone_normalizer_spec.rb`
- `spec/services/whatsapp/phone_number_normalization_service_spec.rb`
- `spec/services/whatsapp/populate_template_parameters_service_spec.rb`
- `spec/services/whatsapp/providers/whatsapp360_dialog_service_spec.rb`
- `spec/services/whatsapp/providers/whatsapp_cloud_service_spec.rb`
- `spec/services/whatsapp/reauthorization_service_spec.rb`
- `spec/services/whatsapp/send_on_whatsapp_service_spec.rb`
- `spec/services/whatsapp/template_parameter_converter_service_spec.rb`
- `spec/services/whatsapp/template_processor_service_spec.rb`
- `spec/services/whatsapp/token_exchange_service_spec.rb`
- `spec/services/whatsapp/user_id_rotation_service_spec.rb`
- `spec/services/whatsapp/webhook_setup_service_spec.rb`
- `spec/services/whatsapp/webhook_teardown_service_spec.rb`

## Frontend files (52)

- `app/javascript/dashboard/api/channel/whatsapp/whatsappCallsAPI.js`
- `app/javascript/dashboard/api/channel/whatsappChannel.js`
- `app/javascript/dashboard/components-next/Campaigns/EmptyState/WhatsAppCampaignEmptyState.vue`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/AccountInformationCard.vue`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/AudienceFields.vue`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/AudienceLabelContacts.vue`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/BasicSettingsFields.vue`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/MessagePreviewCard.vue`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/SchedulePopover.vue`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/SectionCard.vue`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/TemplateFields.vue`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/specs/Preview.spec.js`
- `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/specs/TemplateFields.spec.js`
- `app/javascript/dashboard/components-next/NewConversation/components/WhatsAppOptions.vue`
- `app/javascript/dashboard/components-next/NewConversation/components/WhatsappTemplate.vue`
- `app/javascript/dashboard/components-next/message/bubbles/Text/WhatsappReferral.vue`
- `app/javascript/dashboard/components-next/message/bubbles/WhatsappFlowResponse.vue`
- `app/javascript/dashboard/components-next/message/bubbles/specs/WhatsappFlowResponse.spec.js`
- `app/javascript/dashboard/components-next/message/helpers/specs/whatsappFlowResponse.spec.js`
- `app/javascript/dashboard/components-next/message/helpers/whatsappFlowResponse.js`
- `app/javascript/dashboard/components-next/template-preview/WhatsAppTextTemplate.vue`
- `app/javascript/dashboard/components-next/template-preview/templates/whatsapp-templates.js`
- `app/javascript/dashboard/components-next/whatsapp/WhatsAppTemplateParser.vue`
- `app/javascript/dashboard/components-next/whatsapp/specs/WhatsAppTemplateParser.spec.js`
- `app/javascript/dashboard/components/widgets/conversation/WhatsappTemplates/Modal.vue`
- `app/javascript/dashboard/components/widgets/conversation/WhatsappTemplates/TemplatesPicker.vue`
- `app/javascript/dashboard/components/widgets/conversation/WhatsappTemplates/WhatsAppTemplateReply.vue`
- `app/javascript/dashboard/components/widgets/conversation/specs/WhatsappTemplatesModal.spec.js`
- `app/javascript/dashboard/composables/spec/useWhatsappEmbeddedSignup.spec.js`
- `app/javascript/dashboard/composables/useWhatsappCallSession.js`
- `app/javascript/dashboard/composables/useWhatsappEmbeddedSignup.js`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/WhatsAppCampaignAnalyticsContent.vue`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/WhatsAppCampaignAnalyticsPage.vue`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/WhatsAppCampaignFormPage.spec.js`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/WhatsAppCampaignFormPage.vue`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/WhatsAppCampaignsPage.vue`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/specs/WhatsAppCampaignAnalyticsContent.spec.js`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/specs/WhatsAppCampaignAnalyticsPage.spec.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/360DialogWhatsapp.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/CloudWhatsapp.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Whatsapp.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/WhatsappCall.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/WhatsappEmbeddedSignup.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/WhatsappManualSetup.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/whatsapp/ManualSetupVideo.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/whatsapp/Reauthorize.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/whatsapp/utils.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/WhatsappAccessRequestDialog.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/WhatsappManualMigrationBanner.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/WhatsappManualMigrationDialog.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/WhatsappBusinessManagementToken.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/WhatsappCallingPage.vue`
