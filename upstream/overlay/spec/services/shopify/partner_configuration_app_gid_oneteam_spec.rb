# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the partner app id must be a Shopify App GID.
RSpec.describe Shopify::PartnerConfiguration do
  it 'rejects an app id that is not a GID' do
    values = {
      'SHOPIFY_PARTNER_ORGANIZATION_ID' => '123',
      'SHOPIFY_PARTNER_APP_ID' => '456',
      'SHOPIFY_PARTNER_ACCESS_TOKEN' => 'token'
    }

    expect { described_class.new(values).validate_complete! }
      .to raise_error(Shopify::PartnerClient::ConfigurationError, 'SHOPIFY_PARTNER_APP_ID must be a Shopify App GID')
  end
end
