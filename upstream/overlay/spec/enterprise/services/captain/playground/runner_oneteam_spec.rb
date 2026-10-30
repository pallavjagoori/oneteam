require 'rails_helper'

# OneTeam coverage for the Captain playground run: the assistant answers with
# the playground's draft settings, and the reply carries run details (which
# agent handled it, the tool and handoff events, and how long it took). The
# agent runner has its own specs and is stubbed here.
RSpec.describe Captain::Playground::Runner do
  let(:assistant) { create(:captain_assistant) }
  let(:agent_runner) { instance_double(Captain::Assistant::AgentRunnerService) }
  let(:history) { [{ role: 'user', content: 'Hi' }] }
  let(:runner) { described_class.new(assistant: assistant, configuration_params: { guardrails: ['No refunds'] }, message_history: history) }

  before do
    allow(Captain::Assistant::AgentRunnerService).to receive(:new).and_return(agent_runner)
    allow(agent_runner).to receive(:generate_response).with(message_history: history)
                                                      .and_return('response' => 'Hello!', 'agent_name' => assistant.name)
  end

  it 'answers with the draft settings and adds the run details' do
    result = runner.generate_response

    expect(result).to include('response' => 'Hello!')
    expect(result[:run_details]).to include(events: [], temporary_knowledge_attached: false, duration_ms: a_value >= 0)
    expect(result[:run_details]).to have_key(:handler)
  end

  it 'runs the agent as a playground run with the draft configuration and run-detail callbacks' do
    runner.generate_response

    expect(Captain::Assistant::AgentRunnerService).to have_received(:new) do |**args|
      expect(args[:assistant]).to eq(assistant)
      run_options = args[:run_options]
      expect(run_options.source).to eq('playground')
      expect(run_options.runtime_configuration.guardrails).to eq(['No refunds'])
      expect(run_options.callbacks.keys).to contain_exactly(:on_tool_start, :on_tool_complete, :on_agent_handoff)
    end
  end
end
