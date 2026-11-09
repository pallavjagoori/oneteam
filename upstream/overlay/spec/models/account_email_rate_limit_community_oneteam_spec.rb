# frozen_string_literal: true

require 'rails_helper'

# OneTeam: community edition email limits and transcripts (the enterprise
# plan module replaces both methods), plus feature flag listings.
RSpec.describe Account do
  let(:account) { create(:account, limits: { 'emails' => 25 }) }

  def community(name)
    method = described_class.instance_method(name)
    method = method.super_method until method.owner == AccountEmailRateLimitable
    method.bind(account)
  end

  it 'uses the account email limit and always allows transcripts' do
    expect(community(:email_rate_limit).call).to eq(25)
    expect(community(:email_transcript_enabled?).call).to be(true)
  end

  it 'lists every feature flag and the disabled features' do
    account.disable_features!(:help_center)

    expect(account.all_feature_flags).to include(:feature_help_center)
    expect(account.disabled_features).to include('help_center' => false)
  end
end
