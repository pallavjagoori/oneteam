# frozen_string_literal: true

require 'rails_helper'

# OneTeam: subclasses must supply their OAuth strategy.
RSpec.describe BaseRefreshOauthTokenService do
  it 'requires subclasses to build the OAuth strategy' do
    service = described_class.new(channel: create(:channel_email))

    expect { service.send(:build_oauth_strategy) }.to raise_error(NotImplementedError)
  end
end
