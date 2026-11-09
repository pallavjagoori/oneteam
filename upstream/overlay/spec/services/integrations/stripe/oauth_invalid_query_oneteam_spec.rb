# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a Stripe authorize URL with a malformed query is refused.
RSpec.describe Integrations::Stripe::Oauth do
  it 'rejects an authorize URL whose query is not ASCII-compatible' do
    uri = instance_double(URI::HTTPS, scheme: 'https', host: 'marketplace.stripe.com', userinfo: nil,
                                      path: '/oauth/v2/authorize', query: 'client_id=ca_123'.encode('UTF-16LE'))

    expect(described_class.valid_authorize_url?(uri)).to be(false)
  end
end
