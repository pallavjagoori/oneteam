require 'rails_helper'

# OneTeam coverage for Captain's memory feature: after a conversation, the
# model writes short notes about the contact, which are saved as contact
# notes. Runs against a fake model.
RSpec.describe Captain::Llm::ContactNotesService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account) }
  let(:assistant) { create(:captain_assistant, account: account) }
  let(:conversation) { create(:conversation, account: account) }
  let(:contact) { conversation.contact }
  let(:service) { described_class.new(assistant, conversation) }

  it 'saves each note the model wrote, in the account’s language' do
    model_replies(completion({ role: 'assistant', content: "```json\n{\"notes\": [\"Prefers email\", \"On the Pro plan\"]}\n```" }, 'stop'))

    expect { service.generate_and_update_notes }.to change(contact.notes, :count).by(2)
    expect(contact.notes.pluck(:content)).to contain_exactly('Prefers email', 'On the Pro plan')
    request = model_requests.last
    expect(request['messages'].first['content']).to eq(Captain::Llm::SystemPromptsService.notes_generator(account.locale_english_name))
    expect(request['messages'].last['content']).to start_with("#Contact\n\n").and include("#Conversation\n\n")
  end

  it 'saves nothing when the reply has no notes, is not JSON or is empty' do
    model_replies(json_reply(other: []), completion({ role: 'assistant', content: 'oops' }, 'stop'),
                  completion({ role: 'assistant', content: nil }, 'stop'))

    3.times { service.generate_and_update_notes }

    expect(contact.notes).to be_empty
  end

  it 'reports a model error and saves nothing' do
    allow(ChatwootExceptionTracker).to receive(:new).and_return(instance_double(ChatwootExceptionTracker, capture_exception: true))
    stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad request' } }.to_json)

    service.generate_and_update_notes

    expect(contact.notes).to be_empty
    expect(ChatwootExceptionTracker).to have_received(:new).with(kind_of(RubyLLM::Error), account: account).at_least(:once)
  end
end
