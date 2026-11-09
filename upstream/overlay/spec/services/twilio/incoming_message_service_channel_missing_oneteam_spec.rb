# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unknown Twilio number is logged; a found channel gives the account.
RSpec.describe Twilio::IncomingMessageService do
  it 'logs when no channel matches the incoming number' do
    allow(Rails.logger).to receive(:warn)

    service = described_class.new(params: { AccountSid: 'AC-missing', To: '+15550000000' })

    expect(service.send(:twilio_channel)).to be_nil
    expect(Rails.logger).to have_received(:warn).with(/\[TWILIO\] Incoming message channel lookup failed account_sid=AC-missing/)
  end

  it 'reads the account from the inbox' do
    inbox = build(:inbox)
    service = described_class.new(params: {})
    allow(service).to receive(:inbox).and_return(inbox)

    expect(service.send(:account)).to eq(inbox.account)
  end
end
