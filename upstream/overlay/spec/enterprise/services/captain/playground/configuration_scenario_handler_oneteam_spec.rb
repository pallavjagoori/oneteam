require 'rails_helper'

RSpec.describe Captain::Playground::Configuration do
  it 'describes the scenario that owns an agent name' do
    scenario = instance_double(Captain::Scenario, id: 3, title: 'Refunds')
    configuration = described_class.allocate
    configuration.instance_variable_set(:@selected_scenarios, [scenario])
    configuration.instance_variable_set(:@temporary_scenarios, [])
    configuration.instance_variable_set(:@temporary_metadata, {})
    configuration.instance_variable_set(:@scenario_agent_names, { scenario => 'refunds_agent' })

    expect(configuration.handler_for('refunds_agent')).to eq(type: 'scenario', id: 3, title: 'Refunds', temporary: false)
  end
end
