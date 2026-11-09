require 'rails_helper'

# OneTeam coverage for billing currency when multi-currency billing is on:
# existing Stripe customers stay on USD, new accounts follow their locale.
RSpec.describe Enterprise::Account do
  before { allow(Enterprise::Billing::Currencies).to receive(:enabled?).and_return(true) }

  it 'keeps existing Stripe customers on the default currency' do
    account = build(:account, locale: 'pt_BR', custom_attributes: { 'stripe_customer_id' => 'cus_1' })

    expect(account.billing_currency).to eq(Enterprise::Billing::Currencies::DEFAULT)
  end

  it 'infers the currency from the locale for new accounts' do
    account = build(:account, locale: 'en', custom_attributes: {})

    expect(account.billing_currency).to eq(Enterprise::Billing::Currencies.for_locale('en'))
  end
end
