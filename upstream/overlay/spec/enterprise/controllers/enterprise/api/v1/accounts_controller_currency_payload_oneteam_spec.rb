require 'rails_helper'

RSpec.describe Enterprise::Api::V1::AccountsController do
  it 'offers the supported currencies with a locale based suggestion' do
    controller_instance = described_class.new
    account = create(:account, locale: 'en')
    controller_instance.instance_variable_set(:@account, account)

    expect(controller_instance.send(:currency_selection_payload)).to eq(
      currency_selection_required: true,
      currency_options: Enterprise::Billing::Currencies::SUPPORTED,
      suggested_currency: Enterprise::Billing::Currencies.for_locale('en')
    )
  end
end
