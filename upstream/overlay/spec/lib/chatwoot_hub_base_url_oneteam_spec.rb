# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the community hub lives at its default address (the enterprise module replaces base_url).
RSpec.describe ChatwootHub do
  it 'uses the default hub address in the community edition' do
    method = described_class.method(:base_url)
    method = method.super_method until method.owner == described_class.singleton_class

    expect(method.call).to eq('https://hub.2.chatwoot.com')
  end
end
