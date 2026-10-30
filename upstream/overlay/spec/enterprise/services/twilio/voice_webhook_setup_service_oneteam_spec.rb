require 'rails_helper'

# OneTeam coverage for the rest of Twilio voice setup: keeping the TwiML
# app's voice URL in step with the current host, a phone number Twilio
# doesn't know, and how each Twilio failure is logged and re-raised.
# Requests go to a WebMock fake of Twilio's REST API.
RSpec.describe Twilio::VoiceWebhookSetupService do
  let(:account_sid) { 'AC1' }
  let(:channel) do
    build(:channel_twilio_sms, :with_voice, account: create(:account), phone_number: '+15551230001', account_sid: account_sid,
                                            auth_token: 'token', api_key_sid: 'SK1', api_key_secret: 'secret', twiml_app_sid: 'AP_OLD')
  end
  let(:service) { described_class.new(channel: channel) }
  let(:base) { "https://api.twilio.com/2010-04-01/Accounts/#{account_sid}" }
  let(:json) { { 'Content-Type' => 'application/json' } }

  before { allow(Rails.logger).to receive(:error) }

  def numbers_reply(numbers)
    stub_request(:get, %r{#{Regexp.escape(base)}/IncomingPhoneNumbers\.json})
      .to_return(status: 200, headers: json, body: { incoming_phone_numbers: numbers, meta: { key: 'incoming_phone_numbers' } }.to_json)
  end

  def twilio_error(status, code: 20_404, message: 'The requested resource was not found')
    { status: status, headers: json, body: { code: code, message: message, more_info: 'https://www.twilio.com/docs/errors', status: status }.to_json }
  end

  def logged
    messages = []
    expect(Rails.logger).to have_received(:error) { |message| messages << message }
    messages.join
  end

  describe '#sync_twiml_app!' do
    it 'points the existing TwiML app at the current voice URL' do
      update = stub_request(:post, "#{base}/Applications/AP_OLD.json")
               .with(body: hash_including('VoiceUrl' => channel.voice_call_webhook_url, 'VoiceMethod' => 'POST'))
               .to_return(status: 200, headers: json, body: { sid: 'AP_OLD' }.to_json)

      expect(service.sync_twiml_app!).to eq('AP_OLD')
      expect(update).to have_been_requested
    end

    it 'creates an app when the channel has none' do
      channel.twiml_app_sid = nil
      stub_request(:post, "#{base}/Applications.json")
        .with(body: hash_including('FriendlyName' => 'Chatwoot Voice +15551230001'))
        .to_return(status: 201, headers: json, body: { sid: 'AP_NEW' }.to_json)

      expect(service.sync_twiml_app!).to eq('AP_NEW')
    end

    it 'creates a new app when the stored one was deleted in Twilio' do
      stub_request(:post, "#{base}/Applications/AP_OLD.json").to_return(twilio_error(404))
      stub_request(:post, "#{base}/Applications.json").to_return(status: 201, headers: json, body: { sid: 'AP_NEW' }.to_json)

      expect(service.sync_twiml_app!).to eq('AP_NEW')
    end

    it 'logs the Twilio details of any other failure and re-raises' do
      stub_request(:post, "#{base}/Applications/AP_OLD.json").to_return(twilio_error(500))

      expect { service.sync_twiml_app! }.to raise_error(Twilio::REST::RestError)
      # Twilio's client ignores the body of a 5xx reply, so the code is the HTTP status.
      expect(logged).to include('TWIML_APP_UPDATE', 'status_code: 500', 'twilio_code: 500', '+15551230001', 'backtrace=')
    end
  end

  describe '#configure_number_webhooks!' do
    it 'warns and stops when Twilio has no such number' do
      numbers_reply([])
      allow(Rails.logger).to receive(:warn)

      expect(service.configure_number_webhooks!).to be_nil
      expect(Rails.logger).to have_received(:warn).with('TWILIO_PHONE_NUMBER_NOT_FOUND: +15551230001')
    end

    it 'logs and re-raises a failed update' do
      numbers_reply([{ sid: 'PN1' }])
      stub_request(:post, "#{base}/IncomingPhoneNumbers/PN1.json").to_return(twilio_error(400, code: 21_402, message: 'Bad URL'))

      expect { service.configure_number_webhooks! }.to raise_error(Twilio::REST::RestError)
      expect(logged).to include('NUMBER_WEBHOOKS_UPDATE', 'twilio_code: 21402')
    end
  end

  describe '#perform' do
    it 'logs and re-raises bad credentials' do
      stub_request(:get, %r{#{Regexp.escape(base)}/IncomingPhoneNumbers\.json}).to_return(twilio_error(401, code: 20_003, message: 'Authenticate'))

      expect { service.perform }.to raise_error(Twilio::REST::RestError)
      expect(logged).to include('AUTH_VALIDATION_TOKEN')
    end

    it 'logs and re-raises a failed app creation, without Twilio fields for a network error' do
      numbers_reply([])
      stub_request(:post, "#{base}/Applications.json").to_raise(SocketError.new('no route'))

      expect { service.perform }.to raise_error(Twilio::REST::TwilioError, 'no route')
      expect(logged).to include('TWIML_APP_CREATE', 'error_class: "Twilio::REST::TwilioError"')
      expect(logged).not_to include('status_code')
    end
  end
end
