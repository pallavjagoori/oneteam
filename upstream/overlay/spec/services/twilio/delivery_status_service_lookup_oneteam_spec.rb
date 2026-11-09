require 'rails_helper'

# OneTeam coverage for delivery status callbacks without a messaging service:
# the channel is found by account SID and sender, and misses are logged.
RSpec.describe Twilio::DeliveryStatusService do
  it 'finds the channel by account SID and phone number' do
    channel = create(:channel_twilio_sms, account_sid: 'AC1', phone_number: '+15550001111', messaging_service_sid: nil)
    service = described_class.new(params: { AccountSid: 'AC1', From: '+15550001111' })

    expect(service.send(:twilio_channel)).to eq(channel)
  end

  it 'logs channel lookups that fail' do
    allow(Rails.logger).to receive(:warn)

    described_class.new(params: { AccountSid: 'AC404', From: '+1', MessageSid: 'SM1' }).send(:log_channel_not_found)

    expect(Rails.logger).to have_received(:warn).with(/Delivery status channel lookup failed account_sid=AC404 from=\+1/)
  end
end
