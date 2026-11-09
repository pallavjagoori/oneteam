require 'rails_helper'

# OneTeam coverage for the super admin access token filters by owner type.
RSpec.describe AccessTokenDashboard do
  it 'filters tokens owned by agent bots and platform apps' do
    bot = create(:agent_bot)
    app = create(:platform_app)
    filters = described_class::COLLECTION_FILTERS

    expect(filters[:agent_bot].call(AccessToken.all).pluck(:owner_id)).to include(bot.id)
    expect(filters[:platform_app].call(AccessToken.all).pluck(:owner_type).uniq).to eq(['PlatformApp'])
    expect(filters[:platform_app].call(AccessToken.all).pluck(:owner_id)).to include(app.id)
  end
end
