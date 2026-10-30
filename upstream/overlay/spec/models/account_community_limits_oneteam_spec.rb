require 'rails_helper'

# OneTeam coverage for the community edition's account limits, which the
# enterprise build replaces: agents and inboxes are capped only by the
# installation-wide maximum, and API access and webhooks are always on.
RSpec.describe Account do
  let(:account) { community_edition_of(described_class, :usage_limits, :api_and_webhooks_enabled?).find(create(:account).id) }

  it 'uses the installation maximum for agents and inboxes' do
    allow(ChatwootApp).to receive(:max_limit).and_return(100)

    expect(account.usage_limits).to eq(agents: 100, inboxes: 100)
    expect(account.api_and_webhooks_enabled?).to be(true)
  end
end
