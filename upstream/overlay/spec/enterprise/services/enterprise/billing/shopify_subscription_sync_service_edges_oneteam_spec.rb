require 'rails_helper'

# OneTeam coverage for Shopify subscription sync: the plan of an entitled
# snapshot, and a stored verification time that is not a timestamp.
RSpec.describe Enterprise::Billing::ShopifySubscriptionSyncService do
  it 'resolves the configured plan for an entitled snapshot' do
    service = described_class.new(account: instance_double(Account))
    allow(service).to receive(:configured_plan).and_return({ 'name' => 'Startups' })

    expect(service.send(:resolved_plan, Struct.new(:entitled?).new(true))).to eq('name' => 'Startups')
  end

  it 'rejects snapshots with an invalid verification time' do
    account = instance_double(Account, custom_attributes: { described_class::VERIFIED_AT_KEY => '2026-01-01T00:00:00Z' })
    snapshot = Shopify::SubscriptionSnapshot.allocate
    allow(snapshot).to receive(:to_h).and_return({ 'verified_at' => 'yesterday' })

    expect { described_class.new(account: account).send(:stale_snapshot?, snapshot) }
      .to raise_error(described_class::InvalidSubscription, /invalid verification timestamp/)
  end
end
