require 'rails_helper'

# OneTeam coverage for the message sent when a conversation is auto-resolved:
# nothing without a configured message, the message itself while the
# channel still allows a reply, otherwise an activity note saying it could
# not be sent.
describe MessageTemplates::Template::AutoResolve do
  let(:account) { create(:account, auto_resolve_message: 'Closing this for now') }
  let(:conversation) { create(:conversation, account: account) }

  it 'does nothing without an auto-resolve message' do
    account.update!(auto_resolve_message: nil)

    expect { described_class.new(conversation: conversation).perform }.not_to change(Message, :count)
  end

  it 'sends the message as a template while a reply is allowed' do
    described_class.new(conversation: conversation).perform

    expect(conversation.messages.last).to have_attributes(content: 'Closing this for now', message_type: 'template')
  end

  it 'notes that the message was not sent outside the messaging window' do
    allow(conversation).to receive(:can_reply?).and_return(false)

    expect { described_class.new(conversation: conversation).perform }
      .to have_enqueued_job(Conversations::ActivityMessageJob)
      .with(conversation, hash_including(message_type: :activity,
                                         content: I18n.t('conversations.activity.auto_resolve.not_sent_due_to_messaging_window')))
  end
end
