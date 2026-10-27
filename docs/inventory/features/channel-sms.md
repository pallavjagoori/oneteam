# SMS and Twilio

**Area:** Channels

Twilio SMS and Twilio WhatsApp inboxes, and Bandwidth SMS inboxes.

## HTTP routes (4)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/channels/twilio_channel(.:format)` | `api/v1/accounts/channels/twilio_channels#create` |
| POST | `/webhooks/sms/:phone_number(.:format)` | `webhooks/sms#process_payload` |
| POST | `/twilio/callback(.:format)` | `twilio/callback#create` |
| POST | `/twilio/delivery_status(.:format)` | `twilio/delivery_status#create` |

## Database tables (2)

`channel_sms`, `channel_twilio_sms`

## Backend files (30)

### controllers (5)

- `app/controllers/api/v1/accounts/channels/twilio_channels_controller.rb`
- `app/controllers/twilio/callback_controller.rb`
- `app/controllers/twilio/delivery_status_controller.rb`
- `app/controllers/webhooks/sms_controller.rb`
- `enterprise/app/controllers/concerns/twilio_webhook_verification.rb` (EE)

### jobs (5)

- `app/jobs/channels/twilio/templates_sync_job.rb`
- `app/jobs/channels/twilio/webhook_setup_job.rb`
- `app/jobs/webhooks/sms_events_job.rb`
- `app/jobs/webhooks/twilio_delivery_status_job.rb`
- `app/jobs/webhooks/twilio_events_job.rb`

### models (3)

- `app/models/channel/sms.rb`
- `app/models/channel/twilio_sms.rb`
- `enterprise/app/models/enterprise/channel/twilio_sms.rb` (EE)

### services (16)

- `app/services/sms/delivery_status_service.rb`
- `app/services/sms/incoming_message_service.rb`
- `app/services/sms/oneoff_sms_campaign_service.rb`
- `app/services/sms/send_on_sms_service.rb`
- `app/services/twilio/csat_template_api_client.rb`
- `app/services/twilio/csat_template_service.rb`
- `app/services/twilio/delivery_status_service.rb`
- `app/services/twilio/health_service.rb`
- `app/services/twilio/incoming_message_service.rb`
- `app/services/twilio/media_download_service.rb`
- `app/services/twilio/oneoff_sms_campaign_service.rb`
- `app/services/twilio/referral_params_helper.rb`
- `app/services/twilio/send_on_twilio_service.rb`
- `app/services/twilio/template_processor_service.rb`
- `app/services/twilio/template_sync_service.rb`
- `app/services/twilio/webhook_setup_service.rb`

### views (1)

- `app/views/api/v1/accounts/channels/twilio_channels/create.json.jbuilder`

## Ruby specs (24)

- `spec/controllers/api/v1/accounts/channels/twilio_channels_controller_spec.rb`
- `spec/controllers/twilio/callbacks_controller_spec.rb`
- `spec/controllers/twilio/delivery_status_controller_spec.rb`
- `spec/controllers/webhooks/sms_controller_spec.rb`
- `spec/enterprise/services/twilio/health_service_spec.rb`
- `spec/enterprise/services/twilio/media_download_service_spec.rb`
- `spec/jobs/channels/twilio/templates_sync_job_spec.rb`
- `spec/jobs/webhooks/sms_events_job_spec.rb`
- `spec/jobs/webhooks/twilio_delivery_status_job_spec.rb`
- `spec/jobs/webhooks/twilio_events_job_spec.rb`
- `spec/models/channel/twilio_sms_spec.rb`
- `spec/services/sms/delivery_status_service_spec.rb`
- `spec/services/sms/incoming_message_service_spec.rb`
- `spec/services/sms/oneoff_sms_campaign_service_spec.rb`
- `spec/services/sms/send_on_sms_service_spec.rb`
- `spec/services/twilio/delivery_status_service_spec.rb`
- `spec/services/twilio/health_service_spec.rb`
- `spec/services/twilio/incoming_message_service_spec.rb`
- `spec/services/twilio/media_download_service_spec.rb`
- `spec/services/twilio/oneoff_sms_campaign_service_spec.rb`
- `spec/services/twilio/send_on_twilio_service_spec.rb`
- `spec/services/twilio/template_processor_service_spec.rb`
- `spec/services/twilio/template_sync_service_spec.rb`
- `spec/services/twilio/webhook_setup_service_spec.rb`

## Frontend files (13)

- `app/javascript/dashboard/api/channel/twilioChannel.js`
- `app/javascript/dashboard/api/specs/channel/twilioChannel.spec.js`
- `app/javascript/dashboard/components-next/Campaigns/CampaignCard/SMSCampaignDetails.vue`
- `app/javascript/dashboard/components-next/Campaigns/EmptyState/SMSCampaignEmptyState.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignPage/SMSCampaign/SMSCampaignDialog.vue`
- `app/javascript/dashboard/components-next/Campaigns/Pages/CampaignPage/SMSCampaign/SMSCampaignForm.vue`
- `app/javascript/dashboard/components-next/template-preview/templates/twilio-templates.js`
- `app/javascript/dashboard/routes/dashboard/campaigns/pages/SMSCampaignsPage.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/BandwidthSms.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Sms.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Twilio.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/TwilioHealth.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/components/specs/TwilioHealth.spec.js`
