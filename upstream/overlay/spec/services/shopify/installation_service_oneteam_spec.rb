require 'rails_helper'

# OneTeam coverage for connecting a Shopify store that was installed from the
# Shopify app store: the checks that stop a store being connected twice, or
# to an account billed through Stripe, and the clean-up when saving fails.
RSpec.describe Shopify::InstallationService do
  let(:account) { create(:account, internal_attributes: { 'billing_provider' => 'shopify' }) }
  let(:data) { { 'shop' => 'acme.myshopify.com', 'access_token' => 'token', 'scope' => 'read_orders', 'connected_at' => Time.current.iso8601 } }
  let(:pending_installation) { instance_double(Shopify::PendingInstallation, data: data, consume!: true) }
  let(:service) { described_class.new(account: account, pending_installation: pending_installation) }

  before { allow(pending_installation).to receive(:with_current_installation).and_yield }

  it 'connects the store to the account' do
    service.perform

    expect(account.hooks.find_by(app_id: 'shopify').reference_id).to eq('acme.myshopify.com')
    expect(pending_installation).to have_received(:consume!)
  end

  it 'refuses accounts billed through Stripe' do
    service = described_class.new(account: create(:account), pending_installation: pending_installation)

    expect { service.perform }.to raise_error(Shopify::PendingInstallation::IneligibleAccount)
  end

  it 'refuses an account that already has a Shopify store' do
    create(:integrations_hook, account: account, app_id: 'shopify', reference_id: 'other.myshopify.com')

    expect { service.perform }.to raise_error(Shopify::PendingInstallation::AccountAlreadyConnected)
  end

  it 'refuses a store that another account has connected' do
    create(:integrations_hook, app_id: 'shopify', reference_id: 'ACME.myshopify.com')

    expect { service.perform }.to raise_error(Shopify::PendingInstallation::DuplicateShop)
  end

  it 'reports a duplicate store when the database rejects it' do
    allow(pending_installation).to receive(:with_current_installation).and_raise(ActiveRecord::RecordNotUnique)

    expect { service.perform }.to raise_error(Shopify::PendingInstallation::DuplicateShop)
  end

  it 'reports a duplicate store when validation finds the store taken' do
    hook = Integrations::Hook.new
    hook.errors.add(:reference_id, :taken)
    allow(pending_installation).to receive(:with_current_installation).and_raise(ActiveRecord::RecordInvalid, hook)

    expect { service.perform }.to raise_error(Shopify::PendingInstallation::DuplicateShop)
  end

  it 'passes on other validation errors' do
    allow(pending_installation).to receive(:with_current_installation).and_raise(ActiveRecord::RecordInvalid, Account.new)

    expect { service.perform }.to raise_error(ActiveRecord::RecordInvalid)
  end

  it 'passes on an unknown commit outcome without removing the store' do
    allow(pending_installation).to receive(:consume!).and_raise(Shopify::PendingInstallation::CommitOutcomeUnknown)

    expect { service.perform }.to raise_error(Shopify::PendingInstallation::CommitOutcomeUnknown)
    expect(account.hooks.where(app_id: 'shopify')).to exist
  end

  it 'removes the store again when finishing the installation fails' do
    allow(pending_installation).to receive(:consume!).and_raise(Shopify::PendingInstallation::InvalidToken)

    expect { service.perform }.to raise_error(Shopify::PendingInstallation::InvalidToken)
    expect(account.hooks.where(app_id: 'shopify')).not_to exist
  end
end
