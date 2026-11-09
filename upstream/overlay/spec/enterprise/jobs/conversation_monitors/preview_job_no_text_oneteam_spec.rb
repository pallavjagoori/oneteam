require 'rails_helper'

# OneTeam coverage for preview samples that cannot be evaluated: they are
# counted as excluded instead of failing the preview.
RSpec.describe ConversationMonitors::PreviewJob do
  let(:job) { described_class.new }
  let(:builder) { instance_double(ConversationMonitors::ContextBuilder) }

  before { allow(ConversationMonitors::ContextBuilder).to receive(:new).and_return(builder) }

  it 'excludes conversations without text' do
    allow(builder).to receive(:build).and_raise(CustomExceptions::MonitorEvaluationError.new('no_text'))

    expect(job.send(:matches?, instance_double(Conversation))).to be(false)
    expect(job.instance_variable_get(:@excluded)).to eq(1)
  end

  it 'raises other evaluation errors' do
    allow(builder).to receive(:build).and_raise(CustomExceptions::MonitorEvaluationError.new('provider_busy'))

    expect { job.send(:matches?, instance_double(Conversation)) }.to raise_error(CustomExceptions::MonitorEvaluationError)
  end
end
