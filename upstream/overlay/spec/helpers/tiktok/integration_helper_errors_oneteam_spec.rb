require 'rails_helper'

# OneTeam coverage for TikTok OAuth state tokens that cannot be made or
# checked.
RSpec.describe Tiktok::IntegrationHelper do
  let(:host) { Class.new { include Tiktok::IntegrationHelper }.new }

  before do
    allow(host).to receive(:client_secret).and_return('secret')
    allow(Rails.logger).to receive(:error)
  end

  it 'returns nil when the token cannot be generated' do
    allow(JWT).to receive(:encode).and_raise(StandardError, 'bad key')

    expect(host.generate_tiktok_token(1)).to be_nil
    expect(Rails.logger).to have_received(:error).with('Failed to generate TikTok token: bad key')
  end

  it 'returns nil when verifying fails unexpectedly' do
    allow(JWT).to receive(:decode).and_raise(StandardError, 'boom')

    expect(host.send(:decode_token, 'abc', 'secret')).to be_nil
    expect(Rails.logger).to have_received(:error).with('Unexpected error verifying Tiktok token: boom')
  end
end
