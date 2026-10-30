require 'rails_helper'

# OneTeam coverage for how a Copilot turn saves its model messages on the
# OpenAI Responses API: every output item, reasoning included, is kept as
# raw content, so later model calls and turns send the same items back.
RSpec.describe Captain::Copilot::TurnTranscript do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: admin) }
  let(:chat_class) do
    Struct.new(:model, :provider, :messages) do
      def add_message(attributes)
        messages << RubyLLM::Message.new(attributes)
      end
    end
  end
  let(:chat) { chat_class.new(Struct.new(:id).new('gpt-5'), Struct.new(:slug).new('openai'), []) }

  it 'keeps the Responses output items of each assistant message' do
    transcript = described_class.new(turn, chat, protocol: :responses)
    transcript.load
    output = [{ 'type' => 'reasoning', 'id' => 'rs_1' }, { 'type' => 'message', 'content' => [{ 'text' => '{}' }] }]
    chat.messages << RubyLLM::Message.new(role: :assistant, content: '{}', raw: Struct.new(:body).new({ 'output' => output }))
    chat.messages << RubyLLM::Message.new(role: :assistant, content: 'plain', raw: { 'id' => 'x' })

    transcript.save(turn.lease_token)

    saved = turn.reload.transcript['messages']
    expect(saved.first['raw_content']).to eq(output)
    expect(saved.last).not_to have_key('raw_content')
    expect(chat.messages[-2].raw_content).to eq(output)
  end
end
