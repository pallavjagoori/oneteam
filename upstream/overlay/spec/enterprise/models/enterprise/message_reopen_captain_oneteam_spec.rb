require 'rails_helper'

# OneTeam coverage for reopening a resolved conversation whose inbox has a
# Captain assistant: open it for agents when Captain will not engage,
# otherwise hand it back to the normal (bot) reopen flow.
RSpec.describe Enterprise::Message do
  let(:assistant) { instance_double(Captain::Assistant) }
  let(:inbox) { instance_double(Inbox, captain_assistant: assistant, external_bot_active?: false, active_bot?: true) }
  let(:conversation) { instance_double(Conversation, inbox: inbox, contact: instance_double(Contact), open!: true, pending!: true) }
  let(:message) { Message.new }

  before { allow(message).to receive(:conversation).and_return(conversation) }

  it 'opens the conversation when Captain does not engage' do
    allow(assistant).to receive(:engages?).and_return(false)

    message.send(:reopen_resolved_conversation)

    expect(conversation).to have_received(:open!)
  end

  it 'uses the normal reopen flow when Captain engages' do
    allow(assistant).to receive(:engages?).and_return(true)

    message.send(:reopen_resolved_conversation)

    expect(conversation).to have_received(:pending!)
  end
end
