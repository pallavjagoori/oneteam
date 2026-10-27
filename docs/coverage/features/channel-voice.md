# Voice calls: coverage gaps

## Frontend: 62.3% (1824 of 2927 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/components-next/call/FloatingCallWidget.vue` | 0.0% | 241 |
| `app/javascript/dashboard/components-next/call/CallCard.vue` | 0.0% | 172 |
| `app/javascript/dashboard/components-next/call/CallCard.story.vue` | 0.0% | 159 |
| `app/javascript/dashboard/helper/voice.js` | 29.7% | 156 |
| `app/javascript/dashboard/components-next/Calls/CallRecordingPlayer.vue` | 0.0% | 125 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/VoiceConfigurationPage.vue` | 62.6% | 83 |
| `app/javascript/dashboard/api/channel/voice/twilioVoiceClient.js` | 24.4% | 62 |
| `app/javascript/dashboard/stores/calls.js` | 34.4% | 59 |
| `app/javascript/dashboard/components-next/Calls/constants.js` | 57.8% | 19 |
| `app/javascript/dashboard/api/channel/voice/voiceAPIClient.js` | 62.9% | 13 |
| `app/javascript/dashboard/api/calls.js` | 81.8% | 2 |
| `app/javascript/dashboard/components-next/Calls/CallListItem.vue` | 99.5% | 1 |
| `app/javascript/dashboard/components-next/Calls/CallStatusBadge.vue` | 97.7% | 1 |
| `app/javascript/dashboard/components-next/Calls/CallsEmptyState.vue` | 96.2% | 1 |
| `app/javascript/dashboard/components-next/Calls/CallsFilterBar.vue` | 99.5% | 1 |
| `app/javascript/dashboard/components-next/Contacts/VoiceCallButton.vue` | 99.5% | 1 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/VoiceCallStatus.vue` | 98.3% | 1 |
| `app/javascript/dashboard/components-next/message/bubbles/VoiceCall.vue` | 99.7% | 1 |
| `app/javascript/dashboard/components/widgets/conversation/VoiceCallStatus.vue` | 98.4% | 1 |
| `app/javascript/dashboard/routes/dashboard/calls/routes.js` | 94.4% | 1 |
| `app/javascript/dashboard/routes/dashboard/calls/pages/CallsIndex.vue` | 99.3% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Voice.vue` | 99.3% | 1 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/CallRecordingSettings.vue` | 98.4% | 1 |

## Backend: 93.9% (1329 of 1415 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `enterprise/app/controllers/twilio/voice_controller.rb` | 77.7% | 23 |
| `enterprise/app/services/twilio/voice_webhook_setup_service.rb` | 51.1% | 23 |
| `enterprise/app/services/voice/conference/manager.rb` | 94.1% | 8 |
| `enterprise/app/jobs/voice/call_transcription_job.rb` | 50.0% | 5 |
| `enterprise/app/controllers/concerns/twilio_voice_credentials.rb` | 63.6% | 4 |
| `enterprise/app/services/voice/provider/twilio/recording_attachment_service.rb` | 92.0% | 4 |
| `enterprise/app/jobs/voice/provider/twilio/recording_attachment_job.rb` | 57.1% | 3 |
| `enterprise/app/helpers/twilio/voice_helper.rb` | 60.0% | 2 |
| `enterprise/app/services/twilio/voice_teardown_service.rb` | 88.2% | 2 |
| `enterprise/app/services/voice/fcm_voip_sender.rb` | 92.6% | 2 |
| `enterprise/app/services/voice/inbound_call_builder.rb` | 96.7% | 2 |
| `enterprise/app/services/voice/ringing_timeout_service.rb` | 93.5% | 2 |
| `lib/custom_exceptions/call_already_accepted.rb` | 60.0% | 2 |
| `enterprise/app/controllers/api/v1/accounts/conference_controller.rb` | 98.1% | 1 |
| `enterprise/app/models/call.rb` | 99.1% | 1 |
| `enterprise/app/services/voice/provider/twilio/conference_service.rb` | 98.1% | 1 |
| `enterprise/app/services/voice/status_update_service.rb` | 97.9% | 1 |
