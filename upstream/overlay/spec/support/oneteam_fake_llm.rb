# A fake OpenAI-compatible model endpoint for OneTeam's Captain specs. It
# points RubyLLM at https://llm.example.com (a custom endpoint, so Captain
# uses the Chat Completions API) and answers each request with the next
# queued reply, through WebMock. Specs then exercise Captain's real request
# building and response parsing, which the port must reproduce.
RSpec.shared_context 'with a fake OpenAI-compatible model' do
  let(:fake_llm_url) { 'https://llm.example.com/v1/chat/completions' }

  # RubyLLM's configuration is global, so it is restored after each example.
  around do |example|
    saved = { key: RubyLLM.config.openai_api_key, base: RubyLLM.config.openai_api_base }
    Llm::Config.reset!
    example.run
  ensure
    RubyLLM.config.openai_api_key = saved[:key]
    RubyLLM.config.openai_api_base = saved[:base]
    Llm::Config.reset!
  end

  before do
    InstallationConfig.find_or_initialize_by(name: 'CAPTAIN_OPEN_AI_API_KEY').update!(value: 'test-key')
    InstallationConfig.find_or_initialize_by(name: 'CAPTAIN_OPEN_AI_ENDPOINT').update!(value: 'https://llm.example.com')
    InstallationConfig.find_or_initialize_by(name: 'CAPTAIN_OPEN_AI_MODEL').update!(value: 'gpt-4.1')
  end

  def completion(message, finish_reason)
    { id: 'chatcmpl-1', object: 'chat.completion', model: 'gpt-4.1', choices: [{ index: 0, message: message, finish_reason: finish_reason }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }
  end

  # The model calls one tool.
  def tool_reply(name, call_id: "call_#{name}", **arguments)
    completion({ role: 'assistant', content: nil,
                 tool_calls: [{ id: call_id, type: 'function', function: { name: name, arguments: arguments.to_json } }] }, 'tool_calls')
  end

  # The model answers with JSON text, as Captain's prompts ask it to.
  def json_reply(payload)
    completion({ role: 'assistant', content: payload.to_json }, 'stop')
  end

  def model_replies(*replies)
    stub_request(:post, fake_llm_url)
      .to_return(*replies.map { |reply| { status: 200, body: reply.to_json, headers: { 'Content-Type' => 'application/json' } } })
  end

  # The JSON bodies Captain sent to the model, oldest first. Requests to other
  # faked services are left out.
  def model_requests
    WebMock::RequestRegistry.instance.requested_signatures.hash.keys
                            .select { |request| request.uri.host == 'llm.example.com' }
                            .map { |request| JSON.parse(request.body) }
  end
end
