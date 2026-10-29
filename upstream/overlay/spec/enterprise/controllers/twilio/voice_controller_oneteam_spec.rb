# frozen_string_literal: true

require 'rails_helper'

# OneTeam coverage for Twilio's conference and recording callbacks, which
# Chatwoot's spec only sends with bad signatures: conference events are
# mapped and handed to the conference manager, Twilio's own conference id is
# saved for the later recording lookup, and unknown events are ignored.
RSpec.describe 'Twilio::VoiceController conference and recording callbacks', type: :request do
  let(:channel) { create(:channel_twilio_sms, :with_voice, phone_number: '+15551230004') }
  let(:inbox) { channel.inbox }
  let!(:call) do
    create(:call, account: channel.account, inbox: inbox).tap do |call|
      call.merge_meta!('conference_sid' => call.default_conference_sid)
    end
  end
  let(:manager) { instance_double(Voice::Conference::Manager, process: true) }

  before do
    allow(Twilio::VoiceWebhookSetupService).to receive(:new)
      .and_return(instance_double(Twilio::VoiceWebhookSetupService, perform: 'AP1'))
    allow(Voice::Conference::Manager).to receive(:new).and_return(manager)
  end

  def post_twilio_webhook(endpoint, params)
    path = "/twilio/voice/#{endpoint}/15551230004"
    signature = Twilio::Security::RequestValidator.new(channel.auth_token).build_signature_for("http://www.example.com#{path}", params)
    post path, params: params, headers: { 'X-Twilio-Signature' => signature }
  end

  {
    'conference-start' => 'start', 'participant-join' => 'join', 'participant-leave' => 'leave', 'conference-end' => 'end'
  }.each do |twilio_event, event|
    it "passes #{twilio_event} to the conference manager as #{event}" do
      post_twilio_webhook('conference_status', 'StatusCallbackEvent' => twilio_event, 'FriendlyName' => call.default_conference_sid,
                                               'CallSid' => 'CA_leg', 'ParticipantLabel' => 'contact',
                                               'ReasonParticipantLeft' => 'participant_hung_up')

      expect(response).to have_http_status(:no_content)
      expect(Voice::Conference::Manager).to have_received(:new).with(
        call: call, event: event, participant_label: 'contact', participant_call_sid: 'CA_leg', leave_reason: 'participant_hung_up'
      )
    end
  end

  it 'finds the call by its call id and saves Twilio’s conference id once' do
    2.times do
      post_twilio_webhook('conference_status', 'StatusCallbackEvent' => 'participant-join', 'CallSid' => call.provider_call_id,
                                               'ConferenceSid' => 'CF123')
    end

    expect(call.reload.twilio_conference_sid).to eq('CF123')
    expect(manager).to have_received(:process).twice
  end

  it 'ignores conference events it does not handle' do
    allow(Rails.logger).to receive(:info)

    post_twilio_webhook('conference_status', 'StatusCallbackEvent' => 'participant-mute', 'CallSid' => 'CA_leg')

    expect(response).to have_http_status(:no_content)
    expect(Voice::Conference::Manager).not_to have_received(:new)
    expect(Rails.logger).to have_received(:info).with(/TWILIO_VOICE_CONFERENCE_UNMAPPED_EVENT .*event=participant-mute call_sid=CA_leg/)
  end

  it 'passes recording callbacks to the recording status service' do
    recording = instance_double(Voice::RecordingStatusService, perform: true)
    allow(Voice::RecordingStatusService).to receive(:new).and_return(recording)

    post_twilio_webhook('recording_status', 'RecordingSid' => 'RE1', 'RecordingStatus' => 'completed')

    expect(response).to have_http_status(:no_content)
    expect(Voice::RecordingStatusService).to have_received(:new)
      .with(account: channel.account, payload: hash_including('RecordingSid' => 'RE1', 'RecordingStatus' => 'completed'))
  end

  # The controller raises ArgumentError, which Rails turns into a 500.
  it 'fails on a call direction Twilio does not document' do
    post_twilio_webhook('call', 'CallSid' => 'CA_new', 'From' => '+15550001111', 'Direction' => 'trunking')
    expect(response).to have_http_status(:internal_server_error)
  end
end
