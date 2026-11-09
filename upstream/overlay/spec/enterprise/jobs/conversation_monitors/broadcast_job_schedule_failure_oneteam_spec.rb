# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a failed broadcast enqueue is logged, never raised.
RSpec.describe ConversationMonitors::BroadcastJob do
  it 'logs when scheduling fails' do
    allow(Redis::Alfred).to receive(:set).and_raise(Redis::CannotConnectError)
    allow(Rails.logger).to receive(:error)

    described_class.schedule(1)

    expect(Rails.logger).to have_received(:error).with('Conversation monitor broadcast enqueue failed: Redis::CannotConnectError')
  end
end
