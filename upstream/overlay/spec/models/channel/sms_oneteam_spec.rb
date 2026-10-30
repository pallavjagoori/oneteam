require 'rails_helper'

# OneTeam coverage for a Bandwidth SMS send that fails: the error is logged
# and, when the send was for a message, the message is marked failed with
# Bandwidth's description.
RSpec.describe Channel::Sms do
  let(:channel) { create(:channel_sms) }
  let(:message) { create(:message, inbox: channel.inbox, message_type: :outgoing, content: 'Hi') }

  before do
    stub_request(:post, 'https://messaging.bandwidth.com/api/v2/users/1/messages')
      .to_return(status: 400, body: { description: 'Invalid to number' }.to_json, headers: { 'Content-Type' => 'application/json' })
    allow(Rails.logger).to receive(:error)
  end

  it 'marks the message failed with Bandwidth’s reason' do
    expect(channel.send_message('+1555', message)).to be_nil

    expect(message.reload).to have_attributes(status: 'failed', external_error: 'Invalid to number')
  end

  it 'only logs a failed plain text send' do
    expect(channel.send_text_message('+1555', 'Hi')).to be_nil

    expect(Rails.logger).to have_received(:error).with("[#{channel.account_id}] Error sending SMS: Invalid to number")
  end
end
