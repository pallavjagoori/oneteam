# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the registry answers respond_to? for tools it does not hold.
RSpec.describe Captain::ToolRegistryService do
  it 'does not respond to an unregistered tool' do
    expect(described_class.new(create(:captain_assistant)).respond_to?(:no_such_tool)).to be(false)
  end
end
