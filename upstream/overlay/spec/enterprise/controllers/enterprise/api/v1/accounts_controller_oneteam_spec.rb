require 'rails_helper'

# OneTeam coverage for choosing a billing currency (multi-currency billing,
# for accounts whose locale suggests a currency other than USD), the AI
# credit top-up packages, and a deletion request the account rejects.
RSpec.describe 'Enterprise accounts billing API', type: :request do
  let(:account) { create(:account, locale: 'pt_BR') }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:base_url) { "/enterprise/api/v1/accounts/#{account.id}" }

  def post_currency(currency)
    post "#{base_url}/select_billing_currency", params: { currency: currency }, headers: admin.create_new_auth_token, as: :json
  end

  describe 'POST select_billing_currency' do
    before { create(:installation_config, name: 'ENABLE_MULTI_CURRENCY_BILLING', value: 'true') }

    it 'saves the currency and starts creating the Stripe customer' do
      expect { post_currency(' BRL ') }.to have_enqueued_job(Enterprise::CreateStripeCustomerJob).with(account)

      expect(response).to have_http_status(:no_content)
      expect(account.reload.custom_attributes).to include('billing_currency' => 'brl', 'is_creating_customer' => true)
    end

    it 'rejects an unsupported currency' do
      post_currency('eur')

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body['error']).to eq(I18n.t('errors.billing.invalid_currency'))
    end

    it 'cannot change the currency once the Stripe customer is being created' do
      account.update!(custom_attributes: { 'is_creating_customer' => true })

      post_currency('usd')

      expect(response.parsed_body['error']).to eq(I18n.t('errors.billing.currency_locked'))
    end

    it 'rejects a choice when none is needed' do
      account.update!(locale: 'en')

      post_currency('usd')

      expect(response.parsed_body['error']).to eq(I18n.t('errors.billing.invalid_currency'))
    end
  end

  context 'with Chatwoot Cloud' do
    before { allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(true) }

    it 'lists the top-up packages in the account’s currency' do
      create(:installation_config, name: 'CAPTAIN_TOPUP_OPTIONS', value: { 'usd' => [{ 'credits' => 1000, 'amount' => 20.0 }] })

      get "#{base_url}/topup_options", headers: admin.create_new_auth_token, as: :json

      expect(response.parsed_body).to eq('id' => account.id, 'currency' => 'usd',
                                         'options' => [{ 'credits' => 1000, 'amount' => 20.0, 'currency' => 'usd' }])
    end

    it 'cannot undelete an account that is not marked for deletion' do
      post "#{base_url}/toggle_deletion", params: { action_type: 'undelete' }, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    it 'returns the account’s validation errors when it cannot be marked for deletion' do
      account.update_column(:name, '') # rubocop:disable Rails/SkipsModelValidations

      post "#{base_url}/toggle_deletion", params: { action_type: 'delete' }, headers: admin.create_new_auth_token, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body['message']).to include("Name can't be blank")
    end
  end
end
