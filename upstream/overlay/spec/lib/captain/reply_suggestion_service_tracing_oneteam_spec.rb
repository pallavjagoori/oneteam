require 'rails_helper'

# OneTeam coverage for how a Captain task that uses tools is traced in
# Langfuse. On Chatwoot Cloud and paid self-hosted plans the reply
# suggestion can search the knowledge base, so it runs as a tool session:
# one root span for the task, one generation span per model reply and one
# span per tool call. The model is faked and spans are kept in memory.
RSpec.describe Captain::ReplySuggestionService do
  include_context 'with a fake OpenAI-compatible model'
  include_context 'with Langfuse tracing'

  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, name: 'Jane') }
  let(:conversation) { create(:conversation, account: account) }
  let(:service) { described_class.new(account: account, conversation_display_id: conversation.display_id, user: agent) }

  before do
    allow(ChatwootApp).to receive(:chatwoot_cloud?).and_return(true)
    allow(account).to receive(:feature_enabled?).and_call_original
    allow(account).to receive(:feature_enabled?).with('captain_tasks').and_return(true)
    allow(Captain::Llm::TranslateQueryService).to receive(:new)
      .and_return(instance_double(Captain::Llm::TranslateQueryService, translate: 'refund'))
    allow(Captain::AssistantResponse).to receive(:search).and_return([])
    create(:message, conversation: conversation, message_type: :incoming, content: 'Can I get a refund?')
    model_replies(tool_reply('search_documentation', query: 'refund'),
                  completion({ role: 'assistant', content: 'Yes, within 30 days.' }, 'stop'))
  end

  def attributes(name)
    span_named(name).attributes
  end

  it 'returns the reply and records the task, each generation and the tool call' do
    expect(service.perform[:message]).to eq('Yes, within 30 days.')

    expect(finished_spans.map(&:name))
      .to eq(%w[llm.reply_suggestion.generation tool.search_documentation llm.reply_suggestion.generation llm.reply_suggestion])
  end

  it 'records the task’s input, output and Langfuse trace fields' do
    service.perform

    root = attributes('llm.reply_suggestion')
    expect(JSON.parse(root['langfuse.observation.input']).last).to include('role' => 'user')
    expect(root).to include('langfuse.observation.output' => 'Yes, within 30 days.', 'langfuse.user.id' => account.id.to_s,
                            'langfuse.session.id' => "#{account.id}_#{conversation.display_id}",
                            'langfuse.trace.tags' => ['reply_suggestion'])
  end

  it 'records each generation’s model, usage and the chat so far' do
    service.perform

    generation = finished_spans.reverse.find { |span| span.name == 'llm.reply_suggestion.generation' }.attributes
    expect(generation).to include('gen_ai.provider.name' => 'openai', 'gen_ai.usage.input_tokens' => 10,
                                  'gen_ai.usage.output_tokens' => 5, 'langfuse.observation.output' => 'Yes, within 30 days.')
    expect(generation).to have_key('gen_ai.request.model')
    expect(JSON.parse(generation['langfuse.observation.input']).pluck('role')).to include('user', 'assistant', 'tool')
  end

  it 'records the tool’s arguments and result' do
    service.perform

    expect(attributes('tool.search_documentation')).to include(
      'langfuse.observation.type' => 'tool', 'langfuse.observation.input' => { query: 'refund' }.to_json,
      'langfuse.observation.output' => 'No FAQs found for the given query'.to_json
    )
  end

  it 'marks the task span as failed when the model call fails' do
    stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad request' } }.to_json)

    expect(service.perform).to include(:error)
    root = span_named('llm.reply_suggestion')
    expect(root.status.code).to eq(OpenTelemetry::Trace::Status::ERROR)
    expect(root.attributes['gen_ai.response.error']).to include('bad request')
  end

  context 'when tracing itself fails' do
    before do
      allow(ChatwootExceptionTracker).to receive(:new).and_return(instance_double(ChatwootExceptionTracker, capture_exception: true))
    end

    it 'runs the task untraced if the failure comes before the model call' do
      allow(service).to receive(:set_tool_session_attributes).and_raise('collector down')

      expect(service.perform[:message]).to eq('Yes, within 30 days.')
      expect(ChatwootExceptionTracker).to have_received(:new).with(an_instance_of(RuntimeError), account: account)
    end

    it 'keeps the reply if the failure comes after it' do
      allow(service).to receive(:set_tool_session_error_attributes).and_raise('collector down')

      expect(service.perform[:message]).to eq('Yes, within 30 days.')
      expect(a_request(:post, fake_llm_url)).to have_been_made.twice
    end

    it 'logs a generation it cannot record and carries on' do
      allow(service).to receive(:format_chat_messages).and_raise('collector down')
      allow(Rails.logger).to receive(:warn)

      expect(service.perform[:message]).to eq('Yes, within 30 days.')
      expect(Rails.logger).to have_received(:warn).with('Failed to record generation: collector down').twice
    end
  end
end
