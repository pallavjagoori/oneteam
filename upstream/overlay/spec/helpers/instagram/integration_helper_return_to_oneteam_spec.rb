# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the onboarding return hint round-trips through the Instagram token.
RSpec.describe Instagram::IntegrationHelper do
  let(:host) { Class.new { include Instagram::IntegrationHelper }.new }

  it 'reads the return_to hint from a signed token' do
    allow(GlobalConfigService).to receive(:load).with('INSTAGRAM_APP_SECRET', nil).and_return('test_secret')
    token = host.generate_instagram_token(1, '/onboarding')

    expect(host.instagram_token_return_to(token)).to eq('/onboarding')
  end
end
