require 'rails_helper'

RSpec.describe ConversationMonitors::AutomationDelivery do
  it 'logs instead of raising when the delivery job cannot be enqueued' do
    allow(ConversationMonitors::ProcessAutomationDeliveryJob).to receive(:perform_later).and_raise(RedisClient::CannotConnectError)
    allow(Rails.logger).to receive(:error)

    described_class.new(id: 1).send(:enqueue)

    expect(Rails.logger).to have_received(:error).with(/enqueue failed: RedisClient::CannotConnectError/)
  end
end
