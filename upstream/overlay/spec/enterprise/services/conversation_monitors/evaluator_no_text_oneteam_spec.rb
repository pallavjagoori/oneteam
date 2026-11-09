require 'rails_helper'

# OneTeam coverage for building the action state of a conversation with no
# text: there is nothing to act on, while other errors still raise.
RSpec.describe ConversationMonitors::Evaluator do
  let(:evaluator) { described_class.allocate }
  let(:builder) { instance_double(ConversationMonitors::ContextBuilder) }

  before do
    evaluator.instance_variable_set(:@work, Struct.new(:conversation).new(instance_double(Conversation)))
    evaluator.instance_variable_set(:@snapshot, { live_activity_at: Time.current })
    allow(ConversationMonitors::ContextBuilder).to receive(:new).and_return(builder)
  end

  it 'returns nothing when the conversation has no text' do
    allow(builder).to receive(:build).and_raise(CustomExceptions::MonitorEvaluationError.new('no_text'))

    expect(evaluator.send(:build_action_state, 20)).to be_nil
  end

  it 'raises other errors' do
    allow(builder).to receive(:build).and_raise(CustomExceptions::MonitorEvaluationError.new('context_limit'))

    expect { evaluator.send(:build_action_state, 20) }.to raise_error(CustomExceptions::MonitorEvaluationError)
  end
end
