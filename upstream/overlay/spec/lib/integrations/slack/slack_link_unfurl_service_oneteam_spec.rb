require 'rails_helper'

# OneTeam coverage for Slack link previews: when someone pastes a Chatwoot
# conversation link in Slack, Chatwoot replies with the contact's details.
# Chatwoot's own spec hard-codes account and conversation id 1, so on a
# database where those ids differ it passes without unfurling anything.
RSpec.describe Integrations::Slack::SlackLinkUnfurlService do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account, name: 'Support') }
  let(:contact) do
    create(:contact, account: account, name: 'Ada', email: 'ada@example.com', phone_number: '+15550001111',
                     additional_attributes: { company_name: 'Acme' })
  end
  let(:conversation) { create(:conversation, account: account, inbox: inbox, contact: contact) }
  let(:hook) { create(:integrations_hook, account: account) }
  let(:url) { "https://chat.example/app/accounts/#{account.id}/conversations/#{conversation.display_id}" }
  let(:slack) { instance_double(Integrations::Slack::SendOnSlackService, link_unfurl: true) }

  before { allow(Integrations::Slack::SendOnSlackService).to receive(:new).with(message: nil, hook: hook).and_return(slack) }

  def share(*urls)
    params = { event: { unfurl_id: 'U1', source: 'composer', links: urls.map { |link| { url: link } } } }
    described_class.new(params: params, integration_hook: hook).perform
  end

  def sent_fields
    unfurl = nil
    expect(slack).to have_received(:link_unfurl) { |params| unfurl = params }
    expect(unfurl).to include(unfurl_id: 'U1', source: 'composer')
    JSON.parse(unfurl[:unfurls]).dig(url, 'blocks', 0, 'fields').pluck('text')
  end

  it 'unfurls a conversation link with the contact’s details' do
    share(url)

    expect(sent_fields).to eq(["*Name:*\nAda", "*Email:*\nada@example.com", "*Phone:*\n+15550001111", "*Company:*\nAcme",
                               "*Inbox:*\nSupport", "*Inbox Type:*\nWebsite"])
  end

  it 'shows dashes for missing contact details' do
    contact.update!(name: '', email: nil, phone_number: nil, additional_attributes: {})

    share(url)

    expect(sent_fields.first(4)).to eq(["*Name:*\n---", "*Email:*\n---", "*Phone:*\n---", "*Company:*\n---"])
  end

  it 'skips links to other accounts, unknown conversations and non-conversation pages' do
    share("https://chat.example/app/accounts/#{account.id + 1}/conversations/#{conversation.display_id}",
          "https://chat.example/app/accounts/#{account.id}/conversations/999999",
          "https://chat.example/app/accounts/#{account.id}/contacts/1",
          'https://chat.example/pricing')

    expect(slack).not_to have_received(:link_unfurl)
  end

  it 'does nothing for an event without links' do
    expect(described_class.new(params: { event: {} }, integration_hook: hook).perform).to be_nil
  end
end
