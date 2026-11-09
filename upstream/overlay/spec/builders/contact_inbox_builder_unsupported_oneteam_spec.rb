require 'rails_helper'

# OneTeam coverage for ContactInboxBuilder: a channel that cannot generate a
# source id, and the source id clash fix for SMS inboxes.
describe ContactInboxBuilder do
  let(:account) { create(:account) }
  let(:contact) { create(:contact, account: account, email: 'clash@example.com') }

  it 'refuses to generate a source id for an unsupported channel' do
    stub_request(:post, /graph.facebook.com/)
    inbox = create(:channel_facebook_page, account: account).inbox

    expect { described_class.new(contact: contact, inbox: inbox).perform }
      .to raise_error(RuntimeError, /Unsupported operation for this channel: Channel::FacebookPage/)
  end

  it 'moves an older SMS contact inbox out of the way when the source id clashes' do
    inbox = create(:channel_sms, account: account).inbox
    other = create(:contact, account: account)
    old = create(:contact_inbox, contact: other, inbox: inbox, source_id: '+15550001111')

    contact_inbox = described_class.new(contact: contact, inbox: inbox, source_id: '+15550001111').perform

    expect(contact_inbox.contact).to eq(contact)
    expect(contact_inbox.source_id).to eq('+15550001111')
    expect(old.reload.source_id).to match(/\Awhatsapp:\+15550001111\d+\z/)
  end
end
