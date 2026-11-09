require 'rails_helper'

# OneTeam coverage for Shopify OAuth callbacks: an installation that changed
# during authorization, the OAuth client, and an error redirect for an
# account that no longer exists.
RSpec.describe Shopify::CallbacksController do
  let(:controller_instance) { described_class.allocate }

  before { allow(controller_instance).to receive(:params).and_return(ActionController::Parameters.new(shop: 'acme.myshopify.com')) }

  it 'refuses to continue when the installation generation changed' do
    allow(Shopify::PendingInstallation).to receive(:generation).with(shop: 'acme.myshopify.com').and_return(2)

    expect { controller_instance.send(:with_current_shop_generation, 1) { :connected } }
      .to raise_error(StandardError, 'Shopify installation changed during authorization')
  end

  it 'builds an OAuth client for the shop' do
    allow(controller_instance).to receive_messages(client_id: 'id', client_secret: 'secret')

    client = controller_instance.send(:oauth_client)

    expect(client.site).to eq('https://acme.myshopify.com')
    expect(client.options[:token_url]).to eq('/admin/oauth/access_token')
  end

  it 'falls back to the app URL when the account is gone' do
    controller_instance.instance_variable_set(:@account_id, 0)
    allow(controller_instance).to receive(:frontend_url).and_return('https://app.example')
    allow(controller_instance).to receive(:shopify_integration_url).and_raise(ActiveRecord::RecordNotFound)

    expect(controller_instance.send(:error_redirect_url)).to eq('https://app.example?error=true')
  end
end
