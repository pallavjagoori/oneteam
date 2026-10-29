require 'rails_helper'

# OneTeam coverage for Stripe plan email limits: each plan's daily email
# allowance is multiplied by its paid seats (the free plan's is not), a
# malformed config falls back to the global limit, and email transcripts
# are a paid-plan feature.
RSpec.describe Enterprise::Account::PlanUsageAndLimits do
  let(:account) { create(:account, custom_attributes: { 'plan_name' => 'Startups', 'subscribed_quantity' => 3 }) }

  before do
    create(:installation_config, name: 'CHATWOOT_CLOUD_PLANS', value: [{ 'name' => 'Hacker' }, { 'name' => 'Startups' }])
  end

  context 'with per-plan email limits' do
    before { create(:installation_config, name: 'ACCOUNT_EMAILS_PLAN_LIMITS', value: { 'hacker' => 50, 'startups' => 100 }.to_json) }

    it 'multiplies the plan’s limit by the paid seats' do
      expect(account.email_rate_limit).to eq(300)
    end

    it 'does not multiply the free plan’s limit' do
      account.update!(custom_attributes: { 'plan_name' => 'Hacker', 'subscribed_quantity' => 3 })

      expect(account.email_rate_limit).to eq(50)
    end
  end

  it 'falls back to the default limit when the plan limits cannot be read' do
    create(:installation_config, name: 'ACCOUNT_EMAILS_PLAN_LIMITS', value: '{not json')

    expect(account.email_rate_limit).to eq(ChatwootApp.max_limit.to_i)
  end

  it 'offers email transcripts on paid plans only' do
    expect(account.email_transcript_enabled?).to be(true)

    account.update!(custom_attributes: { 'plan_name' => 'Hacker' })
    expect(account.email_transcript_enabled?).to be(false)
  end
end
