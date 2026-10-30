require 'rails_helper'

# OneTeam coverage for how a Captain agent chat (here the classic Copilot) is
# traced in Langfuse: one session span for the whole agent loop, a
# generation span per model reply and a tool span per tool call, all in one
# trace. The model is faked and spans are kept in memory.
RSpec.describe Captain::Copilot::ChatService do
  include_context 'with a fake OpenAI-compatible model'
  include_context 'with Langfuse tracing'

  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:assistant) { create(:captain_assistant, account: account) }
  let(:contact) { create(:contact, account: account, name: 'Ada') }
  let(:thread) { create(:captain_copilot_thread, account: account, user: user, assistant: assistant) }
  let(:service) { described_class.new(assistant, user_id: user.id, copilot_thread_id: thread.id) }

  before do
    model_replies(tool_reply('get_contact', contact_id: contact.id),
                  json_reply(content: 'Ada is a customer.', reasoning: 'Looked her up.', reply_suggestion: false))
  end

  it 'answers and records the session, each generation and the tool call in one trace' do
    expect(service.generate_response('Who is Ada?')['content']).to eq('Ada is a customer.')

    expect(finished_spans.map(&:name)).to eq(%w[llm.captain.copilot.generation tool.get_contact llm.captain.copilot.generation
                                                llm.captain.copilot])
    expect(finished_spans.map(&:trace_id).uniq.size).to eq(1)
  end

  it 'records the tool’s arguments and the contact it returned' do
    service.generate_response('Who is Ada?')

    tool = span_named('tool.get_contact').attributes
    expect(tool).to include('langfuse.observation.type' => 'tool', 'langfuse.observation.input' => { contact_id: contact.id }.to_json)
    expect(tool['langfuse.observation.output']).to include('Ada')
  end

  it 'records the session’s input and output with the assistant as metadata' do
    service.generate_response('Who is Ada?')

    session = span_named('llm.captain.copilot').attributes
    expect(session['langfuse.observation.output']).to include('Ada is a customer.')
    expect(session).to include('langfuse.trace.metadata.assistant_id' => assistant.id.to_s, 'langfuse.user.id' => account.id.to_s)
  end

  describe 'when a tool span fails' do
    let(:tracer) { tracer_provider.tracer('chatwoot') }

    before { allow(Rails.logger).to receive(:warn) }

    it 'skips a tool span that cannot start, logging why' do
      allow(tracer).to receive(:start_span).and_raise('collector down')

      expect(service.generate_response('Who is Ada?')['content']).to eq('Ada is a customer.')
      expect(Rails.logger).to have_received(:warn).with('Failed to start tool span: collector down')
      expect(finished_spans.map(&:name)).not_to include('tool.get_contact')
    end

    it 'logs a tool span that cannot record its result' do
      allow(tracer).to receive(:start_span).and_wrap_original do |original, *args, **options|
        original.call(*args, **options).tap do |span|
          allow(span).to receive(:set_attribute).and_call_original
          allow(span).to receive(:set_attribute).with('langfuse.observation.output', anything).and_raise('collector down')
        end
      end

      expect(service.generate_response('Who is Ada?')['content']).to eq('Ada is a customer.')
      expect(Rails.logger).to have_received(:warn).with('Failed to end tool span: collector down')
    end
  end
end
