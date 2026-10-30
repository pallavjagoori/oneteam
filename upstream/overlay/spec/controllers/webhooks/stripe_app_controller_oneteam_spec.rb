require 'rails_helper'

# OneTeam coverage for the Stripe App webhook. Stripe signs every event; the
# only event acted on is account.application.deauthorized, which removes the
# Stripe integration from the Chatwoot accounts linked to that Stripe account.
RSpec.describe 'Stripe app webhook', type: :request do
  let(:secret) { 'whsec_test' }
  let(:payload) do
    { id: 'evt_1', object: 'event', type: 'account.application.deauthorized', account: 'acct_123', livemode: false, created: Time.now.to_i }
  end

  def post_event(body, signing_secret: secret)
    raw = body.to_json
    timestamp = Time.current
    signature = Stripe::Webhook::Signature.compute_signature(timestamp, raw, signing_secret)
    post '/webhooks/stripe_app', params: raw, headers: {
      'Content-Type' => 'application/json',
      'Stripe-Signature' => Stripe::Webhook::Signature.generate_header(timestamp, signature)
    }
  end

  context 'with a webhook secret' do
    let(:uninstall) { instance_double(Integrations::Stripe::UninstallationService, perform: true) }

    before do
      allow(GlobalConfig).to receive(:get_value).and_call_original
      allow(GlobalConfig).to receive(:get_value).with('STRIPE_APP_WEBHOOK_SECRET').and_return(secret)
      allow(Integrations::Stripe::UninstallationService).to receive(:new).and_return(uninstall)
    end

    it 'uninstalls the integration on deauthorization' do
      post_event(payload)

      expect(response).to have_http_status(:ok)
      expect(Integrations::Stripe::UninstallationService).to have_received(:new) { |event:| expect(event.account).to eq('acct_123') }
      expect(uninstall).to have_received(:perform)
    end

    it 'ignores other events' do
      post_event(payload.merge(type: 'customer.created'))

      expect(response).to have_http_status(:ok)
      expect(Integrations::Stripe::UninstallationService).not_to have_received(:new)
    end

    it 'rejects a deauthorization with a malformed account id' do
      post_event(payload.merge(account: 'acct_1; drop'))

      expect(response).to have_http_status(:bad_request)
      expect(Integrations::Stripe::UninstallationService).not_to have_received(:new)
    end

    it 'rejects a bad signature' do
      post_event(payload, signing_secret: 'whsec_other')

      expect(response).to have_http_status(:bad_request)
    end

    it 'rejects a body that is not JSON' do
      timestamp = Time.current
      signature = Stripe::Webhook::Signature.compute_signature(timestamp, 'not json', secret)
      post '/webhooks/stripe_app', params: 'not json',
                                   headers: { 'Stripe-Signature' => Stripe::Webhook::Signature.generate_header(timestamp, signature) }

      expect(response).to have_http_status(:bad_request)
    end
  end

  it 'is unavailable until the webhook secret is configured' do
    post '/webhooks/stripe_app', params: '{}'

    expect(response).to have_http_status(:service_unavailable)
  end
end
