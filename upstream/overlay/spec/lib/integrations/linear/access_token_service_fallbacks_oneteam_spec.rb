# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unreadable expiry counts as expired, and the stored token is the last resort.
RSpec.describe Integrations::Linear::AccessTokenService do
  let(:hook) { build(:integrations_hook, app_id: 'linear', access_token: 'lin_token', settings: { expires_on: 'not a time' }) }
  let(:service) { described_class.new(hook: hook) }

  it 'treats an unparseable expiry as invalid' do
    expect(service.send(:token_valid?)).to be(false)
  end

  it 'falls back to the in-memory token when reloading fails' do
    allow(hook).to receive(:reload).and_raise(ActiveRecord::RecordNotFound)

    expect(service.send(:fallback_access_token)).to eq('lin_token')
  end
end
