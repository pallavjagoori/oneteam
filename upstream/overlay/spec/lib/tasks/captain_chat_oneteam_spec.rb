require 'rails_helper'

# OneTeam coverage for `rake captain:chat[assistant_id]`, a terminal chat with
# a Captain assistant that shows its scenarios and tools, the agent's tool
# calls and handoffs, and errors.
RSpec.describe 'captain:chat' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account, name: 'Acme') }
  let(:assistant) { create(:captain_assistant, account: account, name: 'Cap') }
  let(:runner) { instance_double(Captain::Assistant::AgentRunnerService) }
  let(:tool) { Class.new { def self.name = 'Captain::Tools::SearchDocumentationTool' }.new }

  before do
    stub_const('ARGV', [])
    allow(Captain::Assistant::AgentRunnerService).to receive(:new) do |run_options:, **|
      callbacks = run_options.callbacks
      allow(runner).to receive(:generate_response) do
        callbacks[:on_agent_thinking].call(Struct.new(:name).new('Cap'), nil)
        callbacks[:on_tool_start].call(tool, {})
        callbacks[:on_tool_complete].call('handoff_tool', {})
        callbacks[:on_agent_handoff].call('Cap', Struct.new(:name).new('Billing'), 'billing question')
        { 'response' => 'Here you go', 'reasoning' => 'Found it in the docs' }
      end
      runner
    end
  end

  def chat(*lines, id: assistant.id)
    allow(Readline).to receive(:readline).and_return(*lines) if lines.any?
    run_rake('captain:chat', id)
  end

  it 'chats with the assistant until the user leaves' do
    create(:captain_scenario, assistant: assistant, account: account, description: 'x' * 80)
    create(:captain_scenario, assistant: assistant, account: account, tools: nil).update_column(:description, '') # rubocop:disable Rails/SkipsModelValidations

    output = chat(nil, '', 'Where is my order?', 'clear', 'bye').output

    expect(output).to include('Starting chat with Cap', 'Enabled Scenarios (2)', "#{'x' * 61}...", 'Using tool: SearchDocumentation',
                              'Tool handoff_tool completed', 'Handoff: Cap → Billing (billing question)', 'Here you go',
                              '(Reasoning: Found it in the docs)', 'Message history cleared', 'Final conversation log has 0 messages')
  end

  it 'says when the assistant has no scenarios or tools and shows errors' do
    allow(assistant).to receive(:available_tool_ids).and_return([])
    allow(Captain::Assistant).to receive(:find_by).and_return(assistant)
    allow(runner).to receive(:generate_response).and_raise(StandardError, 'LLM down')
    allow(Captain::Assistant::AgentRunnerService).to receive(:new).and_return(runner)

    output = chat('Hello', 'exit').output

    expect(output).to include('No scenarios enabled', 'No tools available', 'Error: LLM down')
  end

  it 'falls back when the agent gives no answer' do
    allow(runner).to receive(:generate_response).and_return({ 'reasoning' => 'Processed by agent' })
    allow(Captain::Assistant::AgentRunnerService).to receive(:new).and_return(runner)

    output = chat('Hello', 'quit').output

    expect(output).to include('No response generated')
    expect(output).not_to include('Reasoning:')
  end

  it 'lists assistants when no id is given' do
    assistant

    result = chat(id: nil)

    expect(result.output).to include("ID: #{assistant.id} - Cap (Account: Acme)")
    expect(result.status).to eq(1)
  end

  it 'needs an existing assistant' do
    expect(chat(id: 0).output).to include('Assistant with ID 0 not found')
  end

  it 'names tools that cannot be named from their class' do
    session = CaptainChatSession.new(assistant)
    broken = Object.new
    def broken.class = raise(StandardError)

    expect(session.send(:extract_tool_name, broken)).to be_a(String)
  end
end
