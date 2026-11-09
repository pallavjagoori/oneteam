# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an assistant shows its own name, and a scenario agent is named by its handoff key.
RSpec.describe Captain::Assistant do
  it 'uses its name as the available name' do
    expect(described_class.new(name: 'Helper').available_name).to eq('Helper')
  end

  it 'names a scenario agent after its handoff key' do
    scenario = Captain::Scenario.new(title: 'Refunds')

    expect(scenario.send(:agent_name)).to eq(scenario.send(:handoff_key))
  end
end
