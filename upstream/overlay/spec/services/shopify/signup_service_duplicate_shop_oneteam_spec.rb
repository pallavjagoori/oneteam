require 'rails_helper'

# OneTeam coverage for Shopify sign-ups that lose the race for a shop: both
# the unique index and the hook validation report a duplicate shop.
RSpec.describe Shopify::SignupService do
  let(:service) { described_class.allocate }
  let(:hooks) { instance_double(ActiveRecord::Associations::CollectionProxy) }

  before do
    data = { 'shop' => 'acme.myshopify.com', 'access_token' => 'tok', 'scope' => 'read', 'connected_at' => '2026-01-01' }
    service.instance_variable_set(:@pending_installation, Struct.new(:data).new(data))
    service.instance_variable_set(:@account, instance_double(Account, hooks: hooks))
    allow(service).to receive(:shopify_shop_exists?).and_return(false)
  end

  it 'reports a duplicate shop on a unique index violation' do
    allow(hooks).to receive(:create!).and_raise(ActiveRecord::RecordNotUnique)

    expect { service.send(:create_shopify_hook) }.to raise_error(Shopify::PendingInstallation::DuplicateShop)
  end

  it 'reports a duplicate shop when the hook validation finds it taken' do
    hook = Integrations::Hook.new
    hook.errors.add(:reference_id, :taken)
    allow(hooks).to receive(:create!).and_raise(ActiveRecord::RecordInvalid.new(hook))

    expect { service.send(:create_shopify_hook) }.to raise_error(Shopify::PendingInstallation::DuplicateShop)
  end
end
