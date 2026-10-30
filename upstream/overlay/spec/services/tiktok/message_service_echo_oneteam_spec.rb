require 'rails_helper'

# OneTeam coverage for TikTok messages the business sends itself: the first
# webhook creates the outgoing message, a repeat of it is ignored.
RSpec.describe Tiktok::MessageService do
  let(:account) { create(:account) }
  let(:channel) { create(:channel_tiktok, account: account, business_id: 'biz-123') }
  let(:contact) { create(:contact, account: account) }
  let(:contact_inbox) { create(:contact_inbox, inbox: channel.inbox, contact: contact, source_id: 'tt-conv-1') }
  let(:content) do
    {
      type: 'text', message_id: 'tt-msg-9', timestamp: 1_700_000_000_000, conversation_id: 'tt-conv-1',
      text: { body: 'Sent from the TikTok app' },
      from: 'Biz', from_user: { id: 'biz-123' }, to: 'Alice', to_user: { id: 'user-1' }
    }
  end

  before do
    allow(Tiktok::Client).to receive(:new).and_return(instance_double(Tiktok::Client, image_send_capable?: false))
  end

  def perform
    service = described_class.new(channel: channel, content: content)
    allow(service).to receive(:create_contact_inbox).and_return(contact_inbox)
    service.perform
  end

  it 'creates the outgoing message once' do
    expect { perform }.to change(Message, :count).by(1)
    expect(Message.last).to have_attributes(message_type: 'outgoing', status: 'delivered')

    expect { perform }.not_to change(Message, :count)
  end
end
