# frozen_string_literal: true

require 'rails_helper'

# OneTeam: Shopify plan limits must be non-negative integers.
RSpec.describe Enterprise::Billing::ShopifyPlanConfiguration do
  it 'rejects a negative limit' do
    expect { described_class.validate_limits!({ 'agents' => -1, 'inboxes' => 2 }, 'plans[0]') }
      .to raise_error(Enterprise::Billing::PlanConfiguration::InvalidConfiguration, 'plans[0].limits must contain non-negative integers')
  end
end
