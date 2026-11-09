# frozen_string_literal: true

require 'rails_helper'

# OneTeam: premium installs see their plan and agent count.
RSpec.describe SuperAdmin::FeaturesHelper do
  it 'describes the premium plan with its agent quantity' do
    allow(ChatwootHub).to receive_messages(pricing_plan: 'premium', pricing_plan_quantity: 25)

    expect(described_class.plan_details).to include('Premium', '25 agents')
  end
end
