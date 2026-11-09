require 'rails_helper'

# OneTeam coverage for releasing the per-inbox in-flight claim when the
# assignment job cannot be enqueued.
RSpec.describe AutoAssignment::AssignmentJob do
  before do
    allow(Redis::Alfred).to receive(:set).and_return(true)
    allow(Redis::Alfred).to receive(:delete_if_equals)
  end

  it 'releases the claim when the enqueue is halted' do
    allow(described_class).to receive(:perform_later).and_return(false)

    expect(described_class.enqueue_for_inbox(5)).to be(false)
    expect(Redis::Alfred).to have_received(:delete_if_equals)
  end

  it 'releases the claim and re-raises when the enqueue raises' do
    allow(described_class).to receive(:perform_later).and_raise(RedisClient::CannotConnectError)

    expect { described_class.enqueue_for_inbox(5) }.to raise_error(RedisClient::CannotConnectError)
    expect(Redis::Alfred).to have_received(:delete_if_equals)
  end
end
