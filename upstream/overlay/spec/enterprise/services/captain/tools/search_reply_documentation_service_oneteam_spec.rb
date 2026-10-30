require 'rails_helper'

# OneTeam coverage for the knowledge base search tool used when Captain
# drafts replies for agents. The query is translated into the account's
# language first, then matched against approved FAQs (Chatwoot defines no other status today): the assistant's own,
# or every assistant's in the account when none is given.
RSpec.describe Captain::Tools::SearchReplyDocumentationService do
  let(:account) { create(:account) }
  let(:assistant) { create(:captain_assistant, account: account) }
  let(:other_assistant) { create(:captain_assistant, account: account) }
  let(:translator) { instance_double(Captain::Llm::TranslateQueryService, translate: 'refund') }
  let(:document) { create(:captain_document, assistant: assistant, account: account, external_link: 'https://docs.example/refunds') }

  before do
    allow(Captain::Llm::TranslateQueryService).to receive(:new).with(account: account).and_return(translator)
    # Search returns every row in the current scope, so the specs see which
    # FAQs the tool searched.
    allow(Captain::AssistantResponse).to receive(:search) { Captain::AssistantResponse.all.order(:id).to_a }
    create(:captain_assistant_response, assistant: assistant, account: account, question: 'Refunds?', answer: 'Within 30 days.',
                                        documentable: document)
    create(:captain_assistant_response, assistant: other_assistant, account: account, question: 'Hours?', answer: '9 to 5.')
  end

  it 'is called search_documentation and takes a query' do
    tool = described_class.new(account: account)

    expect(tool.name).to eq('search_documentation')
    expect(tool.parameters_schema.fetch('properties').keys).to eq(['query'])
  end

  it 'searches the assistant’s approved FAQs with the translated query, citing sources' do
    result = described_class.new(account: account, assistant: assistant).execute(query: 'remboursement')

    expect(result).to eq("\nQuestion: Refunds?\nAnswer: Within 30 days.\nSource: https://docs.example/refunds\n")
    expect(translator).to have_received(:translate).with('remboursement', target_language: account.locale_english_name)
    expect(Captain::AssistantResponse).to have_received(:search).with('refund', account_id: account.id)
  end

  it 'searches every assistant’s approved FAQs when no assistant is given' do
    result = described_class.new(account: account).execute(query: 'refund')

    expect(result).to include('Question: Refunds?', "Question: Hours?\nAnswer: 9 to 5.\n")
  end

  it 'says so when nothing matches' do
    allow(Captain::AssistantResponse).to receive(:search).and_return([])

    expect(described_class.new(account: account).execute(query: 'refund')).to eq('No FAQs found for the given query')
  end
end
