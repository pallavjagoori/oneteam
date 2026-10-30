require 'rails_helper'

# OneTeam coverage for the webhook events Chatwoot's spec leaves out: a
# conversation's status change (with what changed), an edited message
# (activity notes are not sent) and the website widget being opened.
describe WebhookListener do
  let(:listener) { described_class.instance }
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let!(:webhook) { create(:webhook, account: account, inbox: inbox) }

  def expect_webhook(payload)
    expect(WebhookJob).to receive(:perform_later)
      .with(webhook.url, payload, :account_webhook, secret: webhook.secret, delivery_id: instance_of(String))
  end

  it 'sends a status change with the changed attributes' do
    event = Events::Base.new('conversation.status_changed', Time.zone.now, conversation: conversation,
                                                                           changed_attributes: { status: %w[open resolved] })
    expect_webhook(conversation.webhook_data.merge(event: 'conversation_status_changed',
                                                   changed_attributes: [{ status: { previous_value: 'open', current_value: 'resolved' } }]))

    listener.conversation_status_changed(event)
  end

  it 'sends an edited message but not an activity note' do
    message = create(:message, conversation: conversation, account: account, inbox: inbox, message_type: :outgoing)
    expect_webhook(message.webhook_data.merge(event: 'message_updated'))
    listener.message_updated(Events::Base.new('message.updated', Time.zone.now, message: message))

    activity = create(:message, conversation: conversation, account: account, inbox: inbox, message_type: :activity)
    expect(WebhookJob).not_to receive(:perform_later)
    listener.message_updated(Events::Base.new('message.updated', Time.zone.now, message: activity))
  end

  it 'sends the widget being opened with the visit details' do
    contact_inbox = create(:contact_inbox, inbox: inbox)
    event_info = { browser_language: 'en', widget_language: 'en' }
    expect_webhook(contact_inbox.webhook_data.merge(event: 'webwidget_triggered', event_info: event_info))

    listener.webwidget_triggered(Events::Base.new('webwidget.triggered', Time.zone.now, contact_inbox: contact_inbox, event_info: event_info))
  end
end
