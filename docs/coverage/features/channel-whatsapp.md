# WhatsApp: coverage gaps

## Frontend: 52.1% (972 of 1867 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/whatsapp/Reauthorize.vue` | 0.0% | 131 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/WhatsappManualSetup.vue` | 27.8% | 127 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/WhatsappEmbeddedSignup.vue` | 20.0% | 44 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/WhatsappManualMigrationDialog.vue` | 52.2% | 44 |
| `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/AudienceLabelContacts.vue` | 35.8% | 43 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/WhatsappCallingPage.vue` | 4.4% | 43 |
| `app/javascript/dashboard/components/widgets/conversation/WhatsappTemplates/TemplatesPicker.vue` | 33.3% | 38 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Whatsapp.vue` | 26.0% | 37 |
| `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/AudienceFields.vue` | 16.3% | 36 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/WhatsappBusinessManagementToken.vue` | 7.9% | 35 |
| `app/javascript/dashboard/components-next/NewConversation/components/WhatsAppOptions.vue` | 10.8% | 33 |
| `app/javascript/dashboard/routes/dashboard/campaigns/pages/WhatsAppCampaignFormPage.vue` | 80.1% | 32 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/whatsapp/utils.js` | 45.3% | 29 |
| `app/javascript/dashboard/routes/dashboard/campaigns/pages/WhatsAppCampaignAnalyticsContent.vue` | 83.0% | 26 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/WhatsappAccessRequestDialog.vue` | 4.3% | 22 |
| `app/javascript/dashboard/routes/dashboard/campaigns/pages/WhatsAppCampaignsPage.vue` | 0.0% | 21 |
| `app/javascript/dashboard/components-next/message/bubbles/Text/WhatsappReferral.vue` | 20.0% | 20 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/CloudWhatsapp.vue` | 29.6% | 19 |
| `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/SchedulePopover.vue` | 6.7% | 14 |
| `app/javascript/dashboard/components-next/whatsapp/WhatsAppTemplateParser.vue` | 83.3% | 13 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/360DialogWhatsapp.vue` | 31.6% | 13 |
| `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/TemplateFields.vue` | 70.0% | 12 |
| `app/javascript/dashboard/components-next/template-preview/templates/whatsapp-templates.js` | 0.0% | 11 |
| `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/BasicSettingsFields.vue` | 12.5% | 7 |
| `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/SectionCard.vue` | 36.4% | 7 |
| `app/javascript/dashboard/components-next/NewConversation/components/WhatsappTemplate.vue` | 30.0% | 7 |
| `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/AccountInformationCard.vue` | 78.6% | 6 |
| `app/javascript/dashboard/components/widgets/conversation/WhatsappTemplates/WhatsAppTemplateReply.vue` | 25.0% | 6 |
| `app/javascript/dashboard/components-next/Campaigns/WhatsAppCampaign/MessagePreviewCard.vue` | 37.5% | 5 |
| `app/javascript/dashboard/components/widgets/conversation/WhatsappTemplates/Modal.vue` | 66.7% | 5 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/components/WhatsappManualMigrationBanner.vue` | 44.4% | 5 |
| `app/javascript/dashboard/components-next/Campaigns/EmptyState/WhatsAppCampaignEmptyState.vue` | 25.0% | 3 |
| `app/javascript/dashboard/components-next/template-preview/WhatsAppTextTemplate.vue` | 50.0% | 1 |

## Backend: 85.0% (2598 of 3055 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/services/whatsapp/manual_setup_validation_service.rb` | 0.0% | 84 |
| `app/controllers/api/v1/accounts/whatsapp/manual_setup_controller.rb` | 0.0% | 66 |
| `app/services/whatsapp/manual_setup_service.rb` | 0.0% | 52 |
| `app/services/whatsapp/providers/whatsapp_cloud_contact_info_request_service.rb` | 0.0% | 35 |
| `app/services/whatsapp/manual_webhook_status_service.rb` | 0.0% | 32 |
| `app/services/whatsapp/facebook_api_client.rb` | 66.2% | 26 |
| `app/services/whatsapp/oneoff_campaign_service.rb` | 69.4% | 26 |
| `app/services/whatsapp/contact_info_request_service.rb` | 0.0% | 22 |
| `app/models/channel/whatsapp.rb` | 84.0% | 13 |
| `enterprise/app/services/whatsapp/incoming_call_service.rb` | 89.4% | 13 |
| `enterprise/app/jobs/enterprise/webhooks/whatsapp_events_job.rb` | 57.1% | 12 |
| `enterprise/app/services/enterprise/whatsapp/providers/whatsapp_cloud_service.rb` | 82.8% | 10 |
| `app/services/whatsapp/providers/whatsapp_360_dialog_service.rb` | 79.5% | 9 |
| `app/services/whatsapp/providers/base_service.rb` | 89.4% | 7 |
| `app/services/whatsapp/webhook_teardown_service.rb` | 82.1% | 7 |
| `app/services/whatsapp/send_on_whatsapp_service.rb` | 84.6% | 6 |
| `app/services/whatsapp/populate_template_parameters_service.rb` | 92.8% | 5 |
| `app/services/whatsapp/providers/whatsapp_cloud_service.rb` | 95.0% | 5 |
| `app/services/whatsapp/contact_info_response_service.rb` | 94.2% | 4 |
| `enterprise/app/controllers/api/v1/accounts/whatsapp_calls_controller.rb` | 96.1% | 4 |
| `app/services/whatsapp/user_id_rotation_service.rb` | 97.0% | 3 |
| `app/controllers/api/v1/accounts/whatsapp/authorizations_controller.rb` | 95.2% | 2 |
| `app/services/whatsapp/contact_info_request_eligibility_service.rb` | 96.2% | 2 |
| `app/services/whatsapp/phone_normalizers/base_phone_normalizer.rb` | 83.3% | 2 |
| `app/services/whatsapp/webhook_setup_service.rb` | 97.1% | 2 |
| `enterprise/app/services/enterprise/whatsapp/oneoff_campaign_service.rb` | 97.2% | 2 |
| `app/services/whatsapp/embedded_signup_service.rb` | 97.9% | 1 |
| `app/services/whatsapp/incoming_message_base_service.rb` | 99.0% | 1 |
| `app/services/whatsapp/incoming_message_service_helpers.rb` | 98.1% | 1 |
| `app/services/whatsapp/media_upload_service.rb` | 97.5% | 1 |
| `app/services/whatsapp/reauthorization_service.rb` | 95.7% | 1 |
| `lib/custom_exceptions/whatsapp_contact_info_request_error.rb` | 80.0% | 1 |
