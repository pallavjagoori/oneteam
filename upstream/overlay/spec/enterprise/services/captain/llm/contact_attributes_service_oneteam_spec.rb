require 'rails_helper'

# OneTeam coverage for the (not yet wired up) step that asks the model which
# contact attributes a conversation reveals. Today it only returns them.
RSpec.describe Captain::Llm::ContactAttributesService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account) }
  let(:assistant) { create(:captain_assistant, account: account) }
  let(:conversation) { create(:conversation, account: account) }
  let(:service) { described_class.new(assistant, conversation) }

  it 'returns the attributes the model found, sending the contact and conversation' do
    model_replies(completion({ role: 'assistant', content: "```json\n{\"attributes\": [{\"key\": \"plan\"}]}\n```" }, 'stop'))

    expect(service.generate_and_update_attributes).to eq([{ 'key' => 'plan' }])
    user_text = model_requests.last['messages'].reverse.find { |message| message['role'] == 'user' }['content']
    expect(user_text).to start_with("#Contact\n\n").and include("#Conversation\n\n")
    expect(model_requests.last['response_format']).to eq('type' => 'json_object')
  end

  it 'returns no attributes when the reply has none or is not JSON' do
    model_replies(json_reply(other: 1), completion({ role: 'assistant', content: 'sorry' }, 'stop'))

    expect(service.generate_and_update_attributes).to eq([])
    expect(service.generate_and_update_attributes).to eq([])
  end

  it 'returns no attributes for an empty reply' do
    model_replies(completion({ role: 'assistant', content: nil }, 'stop'))

    expect(service.generate_and_update_attributes).to eq([])
  end

  it 'reports a model error and returns no attributes' do
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    stub_request(:post, fake_llm_url).to_return(status: 500, body: { error: { message: 'down' } }.to_json)

    expect(service.generate_and_update_attributes).to eq([])
    expect(ChatwootExceptionTracker).to have_received(:new).with(kind_of(RubyLLM::Error), account: account).at_least(:once)
  end
end
