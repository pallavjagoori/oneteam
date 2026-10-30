require 'rails_helper'

# OneTeam coverage for turning on voice for an existing Twilio SMS inbox:
# an API key and secret are required, and once given the inbox is set up for
# calls and marked as having its account credentials configured.
RSpec.describe 'Enterprise Inboxes API enabling Twilio voice', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:channel) { create(:channel_twilio_sms, :with_phone_number, account: account) }
  let(:numbers) { instance_double(Twilio::REST::Api::V2010::AccountContext::IncomingPhoneNumberList) }

  before do
    allow(Twilio::REST::Client).to receive(:new).and_return(instance_double(Twilio::REST::Client, incoming_phone_numbers: numbers))
    allow(numbers).to receive(:list).and_return([Struct.new(:capabilities).new({ 'voice' => true })])
    allow(Twilio::VoiceWebhookSetupService).to receive(:new).and_return(instance_double(Twilio::VoiceWebhookSetupService, perform: 'AP1'))
  end

  def enable_voice(**credentials)
    patch "/api/v1/accounts/#{account.id}/inboxes/#{channel.inbox.id}",
          params: { channel: { voice_enabled: true, **credentials } }, headers: admin.create_new_auth_token, as: :json
  end

  it 'asks for an API key before enabling voice' do
    enable_voice

    expect(response).to have_http_status(:unprocessable_content)
    expect(channel.reload.voice_enabled).to be(false)
  end

  it 'enables voice with an API key and secret' do
    enable_voice(api_key_sid: 'SK1', api_key_secret: 'secret')

    expect(response).to have_http_status(:ok)
    expect(channel.reload).to have_attributes(voice_enabled: true, api_key_sid: 'SK1', twiml_app_sid: 'AP1')
    expect(channel.account_auth_token_configured?).to be(true)
  end
end
