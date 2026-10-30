require 'rails_helper'

# OneTeam coverage for onboarding brand enrichment: the brand found for the
# sign-up email's domain names the account and is stored as its brand info
# (without replacing brand info already there), onboarding moves past the
# enrichment step, and the admin's browser is told it finished, whether or
# not a brand was found.
RSpec.describe Account::BrandingEnrichmentJob do
  let(:account) { create(:account, name: 'acme', custom_attributes: { 'onboarding_step' => 'enrichment' }) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:branding) { instance_double(WebsiteBrandingService) }
  let(:enrichment_key) { format(Redis::Alfred::ACCOUNT_ONBOARDING_ENRICHMENT, account_id: account.id) }

  before do
    admin
    allow(WebsiteBrandingService).to receive(:new).with('pallav@acme.com').and_return(branding)
    Redis::Alfred.set(enrichment_key, 'true')
  end

  it 'names the account after the brand and finishes enrichment' do
    allow(branding).to receive(:perform).and_return({ title: 'Acme Inc', domain: 'acme.com' })

    expect { described_class.perform_now(account.id, 'pallav@acme.com') }
      .to have_enqueued_job(ActionCableBroadcastJob)
      .with([admin.pubsub_token], 'account.enrichment_completed', { account_id: account.id })

    expect(account.reload.name).to eq('Acme Inc')
    expect(account.custom_attributes).to include('brand_info' => { 'title' => 'Acme Inc', 'domain' => 'acme.com' },
                                                 'onboarding_step' => 'account_details')
    expect(Redis::Alfred.get(enrichment_key)).to be_nil
  end

  it 'still finishes enrichment when no brand is found' do
    allow(branding).to receive(:perform).and_return(nil)
    allow(Rails.logger).to receive(:info)

    described_class.perform_now(account.id, 'pallav@acme.com')

    expect(account.reload).to have_attributes(name: 'acme')
    expect(account.custom_attributes['onboarding_step']).to eq('account_details')
    expect(Rails.logger).to have_received(:info).with(/Enrichment failed for account=#{account.id}/)
  end
end
