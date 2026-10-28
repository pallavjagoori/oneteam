# Voice calls: coverage gaps

## Frontend: 14.2% (132 of 928 lines)

| File | Coverage | Uncovered lines |
| --- | ---: | ---: |
| `app/javascript/dashboard/components-next/message/bubbles/VoiceCall.vue` | 3.1% | 125 |
| `app/javascript/dashboard/components-next/call/FloatingCallWidget.vue` | 0.0% | 91 |
| `app/javascript/dashboard/components-next/Contacts/VoiceCallButton.vue` | 6.3% | 74 |
| `app/javascript/dashboard/components-next/Calls/CallsFilterBar.vue` | 6.5% | 58 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/VoiceConfigurationPage.vue` | 6.6% | 57 |
| `app/javascript/dashboard/components-next/Calls/CallRecordingPlayer.vue` | 0.0% | 50 |
| `app/javascript/dashboard/routes/dashboard/calls/pages/CallsIndex.vue` | 13.0% | 47 |
| `app/javascript/dashboard/components-next/call/CallCard.story.vue` | 0.0% | 44 |
| `app/javascript/dashboard/components-next/call/CallCard.vue` | 0.0% | 42 |
| `app/javascript/dashboard/helper/voice.js` | 36.1% | 39 |
| `app/javascript/dashboard/stores/calls.js` | 5.3% | 36 |
| `app/javascript/dashboard/components-next/Calls/CallListItem.vue` | 37.3% | 32 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/CallRecordingSettings.vue` | 0.0% | 26 |
| `app/javascript/dashboard/components/widgets/conversation/VoiceCallStatus.vue` | 0.0% | 19 |
| `app/javascript/dashboard/components-next/Conversation/ConversationCard/VoiceCallStatus.vue` | 5.3% | 18 |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/Voice.vue` | 5.3% | 18 |
| `app/javascript/dashboard/components-next/Calls/constants.js` | 27.3% | 8 |
| `app/javascript/dashboard/components-next/Calls/CallsEmptyState.vue` | 0.0% | 7 |
| `app/javascript/dashboard/components-next/Calls/CallStatusBadge.vue` | 16.7% | 5 |

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
