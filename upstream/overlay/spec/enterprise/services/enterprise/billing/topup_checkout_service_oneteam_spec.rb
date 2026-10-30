require 'rails_helper'

# OneTeam coverage for AI credit top-ups beyond Chatwoot's own spec: the
# packages offered, a customer without a default card (the first saved card
# becomes the default, or the top-up is refused), and a declined card (the
# invoice is voided and the error passed on).
describe Enterprise::Billing::TopupCheckoutService do
  subject(:service) { described_class.new(account: account) }

  let(:account) { create(:account) }
  let(:stripe_customer) { Struct.new(:invoice_settings, :default_source).new(Struct.new(:default_payment_method).new(nil), nil) }
  let(:payment_methods) { Struct.new(:data).new([Struct.new(:id).new('pm_saved')]) }

  before do
    create(:installation_config, name: 'CHATWOOT_CLOUD_PLANS', value: [
             { 'name' => 'Hacker', 'product_id' => ['prod_hacker'], 'price_ids' => ['price_hacker'] },
             { 'name' => 'Business', 'product_id' => ['prod_business'], 'price_ids' => ['price_business'] }
           ])
    create(:installation_config, name: 'CAPTAIN_TOPUP_OPTIONS', value: { 'usd' => [{ 'credits' => 1000, 'amount' => 20.0 }] })
    account.update!(custom_attributes: { plan_name: 'Business', stripe_customer_id: 'cus_1' })

    allow(Stripe::Customer).to receive(:retrieve).and_return(stripe_customer)
    allow(Stripe::Customer).to receive(:update)
    allow(Stripe::PaymentMethod).to receive(:list).and_return(payment_methods)
    allow(Stripe::Invoice).to receive(:create).and_return(Struct.new(:id).new('inv_1'))
    allow(Stripe::InvoiceItem).to receive(:create)
    allow(Stripe::Invoice).to receive(:finalize_invoice)
    allow(Stripe::Invoice).to receive(:retrieve).and_return(Struct.new(:status).new('paid'))
    allow(Stripe::Billing::CreditGrant).to receive(:create)
  end

  it 'lists the packages for the account’s currency' do
    expect(service.available_options).to eq([{ credits: 1000, amount: 20.0, currency: 'usd' }])
  end

  it 'makes the first saved card the default when none is set' do
    service.create_checkout_session(credits: 1000)

    expect(Stripe::PaymentMethod).to have_received(:list).with(customer: 'cus_1', limit: 1)
    expect(Stripe::Customer).to have_received(:update).with('cus_1', invoice_settings: { default_payment_method: 'pm_saved' })
  end

  it 'refuses a top-up when the customer has no saved card' do
    allow(Stripe::PaymentMethod).to receive(:list).and_return(Struct.new(:data).new([]))

    expect { service.create_checkout_session(credits: 1000) }
      .to raise_error(described_class::Error, I18n.t('errors.topup.no_payment_method'))
    expect(Stripe::Invoice).not_to have_received(:create)
  end

  it 'voids the invoice when the card is declined' do
    allow(Stripe::Invoice).to receive(:retrieve).and_return(Struct.new(:status).new('open'))
    allow(Stripe::Invoice).to receive(:pay).and_raise(Stripe::CardError.new('Your card was declined.', nil))
    allow(Stripe::Invoice).to receive(:void_invoice)

    expect { service.create_checkout_session(credits: 1000) }.to raise_error(Stripe::CardError)
    expect(Stripe::Invoice).to have_received(:void_invoice).with('inv_1')
    expect(Stripe::Billing::CreditGrant).not_to have_received(:create)
  end

  it 'rejects zero credits and accounts without a Stripe customer' do
    expect { service.create_checkout_session(credits: 0) }.to raise_error(described_class::Error, I18n.t('errors.topup.invalid_credits'))

    account.update!(custom_attributes: { plan_name: 'Business' })
    expect { service.create_checkout_session(credits: 1000) }
      .to raise_error(described_class::Error, I18n.t('errors.topup.stripe_customer_not_configured'))
  end
end
