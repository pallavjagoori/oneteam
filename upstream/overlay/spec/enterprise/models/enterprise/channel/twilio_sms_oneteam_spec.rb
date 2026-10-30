require 'rails_helper'

# OneTeam coverage for Twilio voice on an SMS channel: outbound calls go
# through the voice adapter, webhooks can be re-pointed at Chatwoot, and a
# number Twilio does not know (or that has no voice) blocks voice setup with
# a form error.
RSpec.describe Enterprise::Channel::TwilioSms do
  let(:channel) { create(:channel_twilio_sms, :with_voice) }

  it 'starts outbound calls through the Twilio voice adapter' do
    adapter = instance_double(Voice::Provider::Twilio::Adapter, initiate_call: { call_sid: 'CA1' })
    allow(Voice::Provider::Twilio::Adapter).to receive(:new).with(channel).and_return(adapter)

    expect(channel.initiate_call(to: '+15550001111', agent_id: 3)).to eq(call_sid: 'CA1')
    expect(adapter).to have_received(:initiate_call).with(to: '+15550001111', conference_sid: nil, agent_id: 3)
  end

  it 're-points the TwiML app and the number at Chatwoot’s voice webhooks' do
    setup = instance_double(Twilio::VoiceWebhookSetupService, sync_twiml_app!: 'AP_new', configure_number_webhooks!: true)
    allow(Twilio::VoiceWebhookSetupService).to receive(:new).with(channel: channel).and_return(setup)

    channel.reprovision_voice_webhooks!

    expect(channel.reload.twiml_app_sid).to eq('AP_new')
    expect(setup).to have_received(:configure_number_webhooks!)
  end

  it 'does not re-point webhooks for an SMS-only channel' do
    sms = create(:channel_twilio_sms)
    allow(Twilio::VoiceWebhookSetupService).to receive(:new)

    sms.reprovision_voice_webhooks!

    expect(Twilio::VoiceWebhookSetupService).not_to have_received(:new)
  end

  describe 'voice setup on create' do
    let(:numbers) { instance_double(Twilio::REST::Api::V2010::AccountContext::IncomingPhoneNumberList) }
    let(:channel) { build(:channel_twilio_sms, :with_voice, account: create(:account), twiml_app_sid: nil) }

    before do
      allow(channel).to receive(:client).and_return(instance_double(Twilio::REST::Client, incoming_phone_numbers: numbers))
      allow(Rails.logger).to receive(:error)
    end

    it 'fails when the number is not in the Twilio account' do
      allow(numbers).to receive(:list).and_return([])

      expect(channel.save).to be(false)
      expect(channel.errors[:base]).to eq(['Twilio voice setup failed: Phone number not found in Twilio account'])
    end

    it 'fails when the number cannot take voice calls' do
      allow(numbers).to receive(:list).and_return([Struct.new(:capabilities).new({ 'voice' => false })])

      expect(channel.save).to be(false)
      expect(channel.errors[:base]).to eq(['Twilio voice setup failed: This phone number does not support voice calls'])
    end
  end
end
