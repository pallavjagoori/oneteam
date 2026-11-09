require 'rails_helper'

# OneTeam coverage for waiting on another process to finish building the
# unread count cache.
RSpec.describe Conversations::UnreadCounts::Counter do
  it 'polls until the cache is ready' do
    account = create(:account)
    counter = described_class.new(account: account, user: create(:user, account: account))
    allow(counter).to receive(:sleep)
    checks = [false, true]

    counter.send(:wait_for_cache_ready, -> { checks.shift })

    expect(counter).to have_received(:sleep).with(described_class::BUILD_WAIT_INTERVAL).once
  end
end
