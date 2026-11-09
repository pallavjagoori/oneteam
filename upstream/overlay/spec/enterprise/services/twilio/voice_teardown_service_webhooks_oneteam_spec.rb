require 'rails_helper'

# OneTeam coverage for clearing a Twilio number's voice webhooks, and for a
# Twilio error while doing so.
RSpec.describe Twilio::VoiceTeardownService do
  let(:client) { instance_double(Twilio::REST::Client) }
  let(:numbers) { instance_double(Twilio::REST::Api::V2010::AccountContext::IncomingPhoneNumberList) }
  let(:number) { instance_double(Twilio::REST::Api::V2010::AccountContext::IncomingPhoneNumberContext) }
  let(:channel) { instance_double(Channel::TwilioSms, client: client, phone_number: '+15550001111', account_id: 1) }
  let(:service) { described_class.new(channel: channel) }

  before do
    allow(client).to receive(:incoming_phone_numbers).with(no_args).and_return(numbers)
    allow(client).to receive(:incoming_phone_numbers).with('PN1').and_return(number)
    allow(numbers).to receive(:list).and_return([Struct.new(:sid).new('PN1')])
  end

  it 'clears the voice webhooks of the number' do
    allow(number).to receive(:update)

    service.send(:clear_number_webhooks)

    expect(number).to have_received(:update).with(voice_url: '', status_callback: '')
  end

  it 'logs Twilio errors' do
    allow(number).to receive(:update).and_raise(StandardError, 'denied')
    allow(Rails.logger).to receive(:error)

    service.send(:clear_number_webhooks)

    expect(Rails.logger).to have_received(:error).with(/TWILIO_VOICE_TEARDOWN_WEBHOOK_ERROR: StandardError denied/)
  end
end
