require 'rails_helper'

# OneTeam coverage for Stripe price ids keyed by currency, and plans without
# price ids.
RSpec.describe Enterprise::Billing::PlanConfiguration do
  it 'normalizes currency keys' do
    expect(described_class.price_ids_by_currency({ 'price_ids' => { ' USD ' => ['price_1'] } })).to eq('usd' => ['price_1'])
  end

  it 'returns no price ids for a plan without them' do
    expect(described_class.price_ids_by_currency(nil)).to eq({})
  end
end
