require 'rails_helper'

RSpec.describe Concerns::Agentable do
  it 'builds agent instructions lazily from the run context' do
    assistant = create(:captain_assistant)
    allow(assistant).to receive(:agent_instructions).and_return('be helpful')

    agent = assistant.agent(runtime_configuration: { tone: 'warm' })

    expect(agent.instructions.call(:context)).to eq('be helpful')
    expect(assistant).to have_received(:agent_instructions).with(:context, runtime_configuration: { tone: 'warm' })
  end
end
