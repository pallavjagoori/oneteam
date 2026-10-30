# frozen_string_literal: true

require 'rails_helper'

# OneTeam coverage for a recording Twilio sends without a file name (it is
# named from the recording id and its content type, WAV when unknown) and
# for a recording URL that is not a valid URL at all.
RSpec.describe Voice::Provider::Twilio::RecordingAttachmentService do
  let(:channel) { create(:channel_twilio_sms, :with_voice, account_sid: 'AC_account_sid') }
  let(:conversation) { create(:conversation, account: channel.account, inbox: channel.inbox) }
  let(:call) { create(:call, account: channel.account, inbox: channel.inbox, conversation: conversation, contact: conversation.contact) }
  let(:recording_url) { 'https://api.twilio.com/2010-04-01/Accounts/AC_account_sid/Recordings/RE1' }

  before do
    allow(Twilio::VoiceWebhookSetupService).to receive(:new)
      .and_return(instance_double(Twilio::VoiceWebhookSetupService, perform: 'AP1'))
  end

  def attach(content_type)
    audio = Tempfile.new('recording')
    allow(SafeFetch).to receive(:fetch).and_yield(SafeFetch::Result.new(tempfile: audio, filename: nil, content_type: content_type))
    described_class.new(call: call, recording_sid: 'RE1', recording_url: recording_url).perform
    call.reload.recording
  end

  # Rack lists several extensions for audio/mpeg and the inverted lookup keeps
  # the last one, so an MP3 is named .mpga (FINDINGS.md).
  it 'names an unnamed recording from its content type' do
    expect(attach('audio/mpeg').filename.to_s).to eq('call-recording-RE1.mpga')
  end

  it 'treats an unnamed recording without a content type as WAV' do
    recording = attach(nil)

    expect(recording.filename.to_s).to eq('call-recording-RE1.wav')
    expect(recording.content_type).to eq('audio/wav')
  end

  it 'rejects a recording URL that cannot be parsed' do
    service = described_class.new(call: call, recording_sid: 'RE1', recording_url: 'https://api.twilio.com/bad path')

    expect { service.perform }.to raise_error(SafeFetch::InvalidUrlError, 'invalid Twilio recording URL')
  end
end
