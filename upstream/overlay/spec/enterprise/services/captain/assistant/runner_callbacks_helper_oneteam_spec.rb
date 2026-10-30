require 'rails_helper'

# OneTeam coverage for wiring the caller's callbacks (agent thinking, tool
# start and finish, handoff) into a Captain agent runner. A failing callback
# is logged and must not stop the run. The trace-input callback hands the
# current input to the Langfuse tracing state.
RSpec.describe Captain::Assistant::RunnerCallbacksHelper do
  # Records the blocks a runner is given, like the ai-agents runner does.
  let(:runner_class) do
    Class.new do
      attr_reader :handlers

      def initialize
        @handlers = Hash.new { |hash, key| hash[key] = [] }
      end

      %i[on_agent_thinking on_tool_start on_tool_complete on_agent_handoff].each do |event|
        define_method(event) do |&block|
          handlers[event] << block
          self
        end
      end

      def fire(event, *)
        handlers[event].each { |handler| handler.call(*) }
      end
    end
  end
  let(:runner) { runner_class.new }
  let(:calls) { [] }

  def helper_with(callbacks)
    Class.new do
      include Captain::Assistant::RunnerCallbacksHelper

      def initialize(callbacks)
        @callbacks = callbacks
      end
    end.new(callbacks)
  end

  it 'passes each event to its callback' do
    events = %i[on_agent_thinking on_tool_start on_tool_complete on_agent_handoff]
    helper = helper_with(events.index_with { |event| ->(*args) { calls << [event, args] } })

    wired = helper.send(:add_callbacks_to_runner, runner)
    events.each { |event| wired.fire(event, 'agent', 'data') }

    expect(calls).to eq(events.map { |event| [event, %w[agent data]] })
  end

  it 'only wires the callbacks it was given' do
    helper_with(on_tool_start: ->(*) {}).send(:add_callbacks_to_runner, runner)

    expect(runner.handlers.keys).to eq([:on_tool_start])
  end

  it 'logs a failing callback and carries on' do
    allow(Rails.logger).to receive(:warn)
    events = %i[on_agent_thinking on_tool_start on_tool_complete on_agent_handoff]
    helper_with(events.index_with { ->(*) { raise 'boom' } }).send(:add_callbacks_to_runner, runner)

    events.each { |event| runner.fire(event) }

    %w[agent_thinking tool_start tool_complete agent_handoff].each do |name|
      expect(Rails.logger).to have_received(:warn).with("[Captain] Callback error for #{name}: boom")
    end
  end

  describe 'trace input' do
    let(:context_wrapper) { Struct.new(:context) }

    before { helper_with({}).send(:register_trace_input_callback, runner) }

    it 'stores the current input on the tracing state' do
      tracing = {}

      runner.fire(:on_agent_thinking, 'agent', 'input',
                  context_wrapper.new({ __otel_tracing: tracing, captain_v2_trace_current_input: 'Where is my order?' }))

      expect(tracing).to eq(pending_llm_input: 'Where is my order?')
    end

    it 'leaves the tracing state alone without an input, and does nothing when tracing is off' do
      tracing = {}

      runner.fire(:on_agent_thinking, 'agent', 'input', context_wrapper.new({ __otel_tracing: tracing }))
      runner.fire(:on_agent_thinking, 'agent', 'input', context_wrapper.new({}))
      runner.fire(:on_agent_thinking, 'agent', 'input', nil)

      expect(tracing).to be_empty
    end
  end
end
