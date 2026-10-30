require 'rails_helper'

# OneTeam coverage for the Langfuse spans around non-chat model calls
# (embeddings, audio transcription, moderation) and around tool calls,
# recorded in memory. Chatwoot's own spec covers chat completions and agent
# sessions with a mocked tracer.
RSpec.describe Integrations::LlmInstrumentation do
  include_context 'with Langfuse tracing'

  let(:instrumented) { Class.new { include Integrations::LlmInstrumentation }.new }
  let(:account) { create(:account) }

  def attributes(name)
    span_named(name).attributes
  end

  describe '#instrument_audio_transcription' do
    it 'records the model, duration, file and transcript' do
      result = instrumented.instrument_audio_transcription(model: 'whisper-1', duration: 12, file_path: '/tmp/a.mp3') do
        Struct.new(:text).new('Hello there')
      end

      expect(result.text).to eq('Hello there')
      expect(attributes('llm.audio.transcription')).to include(
        'gen_ai.provider.name' => 'openai', 'gen_ai.request.model' => 'whisper-1', 'audio.duration_seconds' => 12,
        'langfuse.observation.input' => '/tmp/a.mp3', 'transcription.length' => 11, 'langfuse.observation.output' => 'Hello there'
      )
    end

    it 'accepts a plain-string transcript and leaves out what it was not given' do
      instrumented.instrument_audio_transcription(span_name: 'llm.stt', model: 'whisper-1') { 'Hi' }

      expect(attributes('llm.stt')).to include('transcription.length' => 2)
      expect(attributes('llm.stt').keys).not_to include('audio.duration_seconds', 'langfuse.observation.input')
    end
  end

  describe '#instrument_moderation_call' do
    let(:moderation) { Struct.new(:flagged?, :flagged_categories).new(true, ['violence']) }

    it 'records whether the input was flagged and why' do
      instrumented.instrument_moderation_call(input: 'bad words') { moderation }

      expect(attributes('llm.moderation')).to include(
        'gen_ai.request.model' => 'text-moderation-latest', 'moderation.input_length' => 9, 'moderation.flagged' => true,
        'moderation.categories' => '["violence"]', 'langfuse.observation.output' => { flagged: true, categories: ['violence'] }.to_json
      )
    end

    it 'records an unknown verdict for a result it cannot read' do
      instrumented.instrument_moderation_call(model: 'omni-moderation-latest') { :unknown }

      expect(attributes('llm.moderation')).to include('moderation.input_length' => 0,
                                                      'langfuse.observation.output' => { flagged: nil, categories: [] }.to_json)
    end
  end

  describe '#instrument_embedding_call' do
    it 'records the number of dimensions' do
      instrumented.instrument_embedding_call(model: 'text-embedding-3-small', input: 'hello') { [0.1, 0.2, 0.3] }

      expect(attributes('llm.embedding')).to include('embedding.dimensions' => 3, 'langfuse.observation.output' => '[3 dimensions]')
    end
  end

  describe 'when a span fails' do
    before do
      allow(ChatwootExceptionTracker).to receive(:new).and_return(instance_double(ChatwootExceptionTracker, capture_exception: true))
    end

    it 'keeps the result when recording it fails, reporting the error on the account' do
      allow(instrumented).to receive(:set_embedding_result_attributes).and_raise('collector down')

      expect(instrumented.instrument_embedding_call(account_id: account.id, input: 'x') { [1.0] }).to eq([1.0])
      expect(ChatwootExceptionTracker).to have_received(:new).with(an_instance_of(RuntimeError), account: account)
    end

    it 're-raises when the model call itself fails' do
      expect { instrumented.instrument_moderation_call(account: account, input: 'x') { raise 'rate limited' } }
        .to raise_error('rate limited')
      expect(ChatwootExceptionTracker).to have_received(:new).with(an_instance_of(RuntimeError), account: account)
    end
  end

  describe '#instrument_tool_call' do
    it 'records the tool’s input and output, marking an error result as failed' do
      result = instrumented.instrument_tool_call('lookup', { id: 1 }) { { error: 'not found' } }

      expect(result).to eq(error: 'not found')
      span = span_named('tool.lookup')
      expect(span.attributes).to include('langfuse.observation.type' => 'tool', 'langfuse.observation.input' => '{"id":1}',
                                         'langfuse.observation.output' => '{"error":"not found"}')
      expect(span.status.code).to eq(OpenTelemetry::Trace::Status::ERROR)
    end

    it 'runs the tool untraced when tracing is off' do
      InstallationConfig.find_by(name: 'OTEL_PROVIDER').update!(value: '')

      expect(instrumented.instrument_tool_call('lookup', {}) { 'ok' }).to eq('ok')
      expect(finished_spans).to be_empty
    end
  end

  it 'names the provider from the model, defaulting to OpenAI' do
    expect(%w[claude-sonnet gemini-2 my-local-model].map { |model| instrumented.determine_provider(model) })
      .to eq(%w[anthropic google openai])
  end

  it 'finds no account for the error report when none is given' do
    expect(instrumented.send(:resolve_account, {})).to be_nil
  end
end
