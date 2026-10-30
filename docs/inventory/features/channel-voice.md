# Voice calls

**Area:** Channels

Voice inboxes and in-app calling: Twilio voice, conferences, call records, ringing timeouts and call business hours.

**Feature flags:** `voice_recorder`, `channel_voice`, `mobile_voice_push`

## HTTP routes (12)

| Verb | Path | Controller#action |
| --- | --- | --- |
| POST | `/api/v1/accounts/:account_id/contacts/:id/call(.:format)` | `api/v1/accounts/contacts/calls#create` |
| GET | `/api/v1/accounts/:account_id/calls(.:format)` | `api/v1/accounts/calls#index` |
| GET | `/api/v1/accounts/:account_id/inboxes/:inbox_id/conference/token(.:format)` | `api/v1/accounts/conference#token` |
| DELETE | `/api/v1/accounts/:account_id/inboxes/:inbox_id/conference(.:format)` | `api/v1/accounts/conference#destroy` |
| POST | `/api/v1/accounts/:account_id/inboxes/:inbox_id/conference(.:format)` | `api/v1/accounts/conference#create` |
| POST | `/api/v1/accounts/:account_id/inboxes/:id/set_call_recording(.:format)` | `api/v1/accounts/inboxes#set_call_recording` |
| PATCH | `/api/v1/accounts/:account_id/inboxes/:inbox_id/call_business_hours(.:format)` | `api/v1/accounts/inboxes/call_business_hours#update` |
| PUT | `/api/v1/accounts/:account_id/inboxes/:inbox_id/call_business_hours(.:format)` | `api/v1/accounts/inboxes/call_business_hours#update` |
| POST | `/twilio/voice/call/:phone(.:format)` | `twilio/voice#call_twiml` |
| POST | `/twilio/voice/status/:phone(.:format)` | `twilio/voice#status` |
| POST | `/twilio/voice/conference_status/:phone(.:format)` | `twilio/voice#conference_status` |
| POST | `/twilio/voice/recording_status/:phone(.:format)` | `twilio/voice#recording_status` |

## Database tables (1)

`calls`

## Backend files (49)

### controllers (6)

- `enterprise/app/controllers/api/v1/accounts/calls_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/conference_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/contacts/calls_controller.rb` (EE)
- `enterprise/app/controllers/api/v1/accounts/inboxes/call_business_hours_controller.rb` (EE)
- `enterprise/app/controllers/concerns/twilio_voice_credentials.rb` (EE)
- `enterprise/app/controllers/twilio/voice_controller.rb` (EE)

### finders (1)

- `enterprise/app/finders/call_finder.rb` (EE)

### helpers (1)

- `enterprise/app/helpers/twilio/voice_helper.rb` (EE)

### jobs (10)

- `app/jobs/internal/check_ringing_timeouts_job.rb`
- `enterprise/app/jobs/voice/call_transcription_job.rb` (EE)
- `enterprise/app/jobs/voice/end_conference_job.rb` (EE)
- `enterprise/app/jobs/voice/failed_add_recheck_job.rb` (EE)
- `enterprise/app/jobs/voice/hang_up_contact_job.rb` (EE)
- `enterprise/app/jobs/voice/missed_call_notification_job.rb` (EE)
- `enterprise/app/jobs/voice/provider/twilio/recording_attachment_job.rb` (EE)
- `enterprise/app/jobs/voice/ringing_timeout_job.rb` (EE)
- `enterprise/app/jobs/voice/sync_provider_status_job.rb` (EE)
- `enterprise/app/jobs/voice/voip_push_job.rb` (EE)

### lib (2)

- `lib/custom_exceptions/call_already_accepted.rb`
- `enterprise/lib/voice/call_errors.rb` (EE)

### models (2)

- `enterprise/app/models/call.rb` (EE)
- `enterprise/app/models/concerns/call_recording_settings.rb` (EE)

### services (23)

- `enterprise/app/services/twilio/voice_teardown_service.rb` (EE)
- `enterprise/app/services/twilio/voice_webhook_setup_service.rb` (EE)
- `enterprise/app/services/voice/apns_voip_sender.rb` (EE)
- `enterprise/app/services/voice/business_hours_settings_service.rb` (EE)
- `enterprise/app/services/voice/call_message_builder.rb` (EE)
- `enterprise/app/services/voice/call_status/manager.rb` (EE)
- `enterprise/app/services/voice/call_transcription_service.rb` (EE)
- `enterprise/app/services/voice/conference/manager.rb` (EE)
- `enterprise/app/services/voice/fcm_voip_sender.rb` (EE)
- `enterprise/app/services/voice/inbound_call_builder.rb` (EE)
- `enterprise/app/services/voice/outbound_call_builder.rb` (EE)
- `enterprise/app/services/voice/provider/twilio/adapter.rb` (EE)
- `enterprise/app/services/voice/provider/twilio/conference_service.rb` (EE)
- `enterprise/app/services/voice/provider/twilio/inbound_caller.rb` (EE)
- `enterprise/app/services/voice/provider/twilio/recording_attachment_service.rb` (EE)
- `enterprise/app/services/voice/provider/twilio/token_service.rb` (EE)
- `enterprise/app/services/voice/recording_status_service.rb` (EE)
- `enterprise/app/services/voice/ring_readiness.rb` (EE)
- `enterprise/app/services/voice/ring_recipients.rb` (EE)
- `enterprise/app/services/voice/ringing_timeout_service.rb` (EE)
- `enterprise/app/services/voice/status_update_service.rb` (EE)
- `enterprise/app/services/voice/voip_push_payloads.rb` (EE)
- `enterprise/app/services/voice/voip_push_service.rb` (EE)

### views (4)

- `app/views/mailers/agent_notifications/conversation_notifications_mailer/voice_call_missed.liquid`
- `enterprise/app/views/api/v1/accounts/calls/index.json.jbuilder` (EE)
- `enterprise/app/views/api/v1/models/_call.json.jbuilder` (EE)
- `enterprise/app/views/twilio/voice/out_of_hours.xml.builder` (EE)

## Ruby specs (33)

- `spec/enterprise/controllers/api/v1/accounts/calls_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/conference_controller_spec.rb`
- `spec/enterprise/controllers/api/v1/accounts/inboxes/call_business_hours_controller_spec.rb`
- `spec/enterprise/controllers/twilio/voice_controller_spec.rb`
- `spec/enterprise/finders/call_finder_spec.rb`
- `spec/enterprise/jobs/internal/check_ringing_timeouts_job_spec.rb`
- `spec/enterprise/jobs/voice/end_conference_job_spec.rb`
- `spec/enterprise/jobs/voice/failed_add_recheck_job_spec.rb`
- `spec/enterprise/jobs/voice/hang_up_contact_job_spec.rb`
- `spec/enterprise/jobs/voice/missed_call_notification_job_spec.rb`
- `spec/enterprise/jobs/voice/ringing_timeout_job_spec.rb`
- `spec/enterprise/jobs/voice/sync_provider_status_job_spec.rb`
- `spec/enterprise/jobs/voice/voip_push_job_spec.rb`
- `spec/enterprise/models/call_spec.rb`
- `spec/enterprise/models/channel/twilio_sms_voice_spec.rb`
- `spec/enterprise/services/twilio/voice_webhook_setup_service_spec.rb`
- `spec/enterprise/services/voice/business_hours_settings_service_spec.rb`
- `spec/enterprise/services/voice/call_status/manager_spec.rb`
- `spec/enterprise/services/voice/call_transcription_service_spec.rb`
- `spec/enterprise/services/voice/conference/manager_join_spec.rb`
- `spec/enterprise/services/voice/conference/manager_spec.rb`
- `spec/enterprise/services/voice/inbound_call_builder_spec.rb`
- `spec/enterprise/services/voice/outbound_call_builder_spec.rb`
- `spec/enterprise/services/voice/provider/twilio/adapter_spec.rb`
- `spec/enterprise/services/voice/provider/twilio/conference_service_spec.rb`
- `spec/enterprise/services/voice/provider/twilio/inbound_caller_spec.rb`
- `spec/enterprise/services/voice/provider/twilio/recording_attachment_service_spec.rb`
- `spec/enterprise/services/voice/provider/twilio/token_service_spec.rb`
- `spec/enterprise/services/voice/recording_status_service_spec.rb`
- `spec/enterprise/services/voice/ring_readiness_spec.rb`
- `spec/enterprise/services/voice/ringing_timeout_service_spec.rb`
- `spec/enterprise/services/voice/status_update_service_spec.rb`
- `spec/enterprise/services/voice/voip_push_service_spec.rb`

## Frontend files (24)

- `app/javascript/dashboard/api/calls.js`
- `app/javascript/dashboard/api/channel/voice/specs/voiceAPIClient.spec.js`
- `app/javascript/dashboard/api/channel/voice/twilioVoiceClient.js`
- `app/javascript/dashboard/api/channel/voice/voiceAPIClient.js`
- `app/javascript/dashboard/components-next/Calls/CallListItem.vue`
- `app/javascript/dashboard/components-next/Calls/CallRecordingPlayer.vue`
- `app/javascript/dashboard/components-next/Calls/CallStatusBadge.vue`
- `app/javascript/dashboard/components-next/Calls/CallsEmptyState.vue`
- `app/javascript/dashboard/components-next/Calls/CallsFilterBar.vue`
- `app/javascript/dashboard/components-next/Calls/constants.js`
- `app/javascript/dashboard/components-next/Contacts/VoiceCallButton.vue`
- `app/javascript/dashboard/components-next/Conversation/ConversationCard/VoiceCallStatus.vue`
- `app/javascript/dashboard/components-next/call/CallCard.story.vue`
- `app/javascript/dashboard/components-next/call/CallCard.vue`
- `app/javascript/dashboard/components-next/call/FloatingCallWidget.vue`
- `app/javascript/dashboard/components-next/message/bubbles/VoiceCall.vue`
- `app/javascript/dashboard/components/widgets/conversation/VoiceCallStatus.vue`
- `app/javascript/dashboard/helper/voice.js`
- `app/javascript/dashboard/routes/dashboard/calls/pages/CallsIndex.vue`
- `app/javascript/dashboard/routes/dashboard/calls/routes.js`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Voice.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/CallRecordingSettings.vue`
- `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/VoiceConfigurationPage.vue`
- `app/javascript/dashboard/stores/calls.js`
