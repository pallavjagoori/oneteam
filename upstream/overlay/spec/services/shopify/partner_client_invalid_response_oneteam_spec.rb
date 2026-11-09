# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a well-formed but unreadable Partner API answer is a provider error.
RSpec.describe Shopify::PartnerClient do
  it 'wraps a snapshot parse failure as an invalid response' do
    client = described_class.new
    body = { 'data' => { 'activeSubscription' => nil, 'events' => { 'edges' => [] } } }
    response = instance_double(HTTParty::Response, success?: true, parsed_response: body, code: 200)
    allow(client).to receive(:request).and_return(response)
    allow(Shopify::SubscriptionSnapshot).to receive(:from_partner_response).and_raise(KeyError)

    expect { client.subscription_snapshot(shop_id: 'gid://shopify/Shop/1') }
      .to raise_error(described_class::ProviderError, 'Shopify Partner API returned an invalid response')
  end
end
