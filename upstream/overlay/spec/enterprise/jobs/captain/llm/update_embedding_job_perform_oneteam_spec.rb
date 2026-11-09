require 'rails_helper'

# OneTeam coverage for refreshing a record's embedding.
RSpec.describe Captain::Llm::UpdateEmbeddingJob do
  it 'stores the new embedding' do
    record = instance_double(Captain::AssistantResponse, account_id: 3, update!: true)
    service = instance_double(Captain::Llm::EmbeddingService, get_embedding: [0.1, 0.2])
    allow(Captain::Llm::EmbeddingService).to receive(:new).with(account_id: 3).and_return(service)

    described_class.new.perform(record, 'How do refunds work?')

    expect(record).to have_received(:update!).with(embedding: [0.1, 0.2])
  end
end
