# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a malformed Admin API shop answer becomes a provider error.
RSpec.describe Shopify::ShopIdentity do
  it 'wraps a lookup failure with the error class name' do
    identity = described_class.new(hook: nil)
    allow(identity).to receive(:fetch_shop).and_raise(KeyError)

    expect { identity.shop_id }.to raise_error(described_class::ProviderError, 'Shopify Admin API shop lookup failed (KeyError)')
  end
end
