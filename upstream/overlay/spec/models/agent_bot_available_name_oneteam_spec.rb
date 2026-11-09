require 'rails_helper'

# OneTeam coverage: a bot shows its own name wherever an agent's display name
# is used (mailers, message senders).
RSpec.describe AgentBot do
  it 'uses its name as the available name' do
    expect(build(:agent_bot, name: 'Helper').available_name).to eq('Helper')
  end
end
