require 'rails_helper'

# OneTeam coverage: a failed embedding request is logged and raised as an
# EmbeddingsError, which callers rescue.
RSpec.describe Captain::Llm::EmbeddingService do
  it 'raises an EmbeddingsError when the API fails' do
    allow(RubyLLM).to receive(:embed).and_raise(RubyLLM::Error.new('quota exceeded'))
    allow(Rails.logger).to receive(:error)

    expect { described_class.new.get_embedding('hello') }
      .to raise_error(described_class::EmbeddingsError, 'Failed to create an embedding: quota exceeded')
    expect(Rails.logger).to have_received(:error).with('Embedding API Error: quota exceeded')
  end
end
