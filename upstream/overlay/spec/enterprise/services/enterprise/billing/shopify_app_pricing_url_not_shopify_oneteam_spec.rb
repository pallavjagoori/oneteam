# frozen_string_literal: true

require 'rails_helper'

# OneTeam: Shopify pricing is only for accounts billed through Shopify.
RSpec.describe Enterprise::Billing::ShopifyAppPricingUrl do
  it 'refuses an account billed elsewhere' do
    allow(Shopify::FeatureGate).to receive(:enabled?).and_return(true)
    service = described_class.new(account: create(:account))

    expect { service.send(:ensure_eligible!) }.to raise_error(described_class::NotEligible, 'Account is not billed through Shopify')
  end
end
