# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unknown paid plan name grants no plan features.
RSpec.describe Enterprise::Billing::ReconcilePlanFeaturesService do
  it 'grants nothing for an unknown plan' do
    service = described_class.new(account: create(:account, custom_attributes: { 'plan_name' => 'Mystery' }))
    allow(service).to receive_messages(default_plan?: false, shopify_billing?: false)

    expect(service.send(:current_plan_features)).to eq([])
  end
end
