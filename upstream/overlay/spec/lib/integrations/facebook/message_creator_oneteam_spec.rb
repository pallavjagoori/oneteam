require 'rails_helper'

# OneTeam coverage for routing a Messenger webhook event to the right inbox.
# A contact's message goes to the page it was sent to. An echo of a message
# the page sent goes to the sending page as an agent message, unless
# Chatwoot itself sent it (Chatwoot already has that message).
RSpec.describe Integrations::Facebook::MessageCreator do
  let(:page) { create(:channel_facebook_page, page_id: 'PAGE1') }
  let(:builder) { instance_double(Messages::Facebook::MessageBuilder, perform: true) }

  before do
    allow(Facebook::Messenger::Subscriptions).to receive(:subscribe).and_return(true)
    page
    allow(Messages::Facebook::MessageBuilder).to receive(:new).and_return(builder)
  end

  def event(sender:, recipient:, echo: nil, app_id: nil)
    message = { mid: 'm1', text: 'hi', is_echo: echo, app_id: app_id }.compact
    Integrations::Facebook::MessageParser.new({ messaging: { sender: { id: sender }, recipient: { id: recipient }, message: message } }.to_json)
  end

  it 'adds a contact’s message to the page that received it' do
    response = event(sender: 'PSID1', recipient: 'PAGE1')

    described_class.new(response).perform

    expect(Messages::Facebook::MessageBuilder).to have_received(:new).with(response, page.inbox)
    expect(builder).to have_received(:perform)
  end

  it 'adds a reply sent from the page itself as an agent message' do
    response = event(sender: 'PAGE1', recipient: 'PSID1', echo: true, app_id: 'OTHER_APP')

    described_class.new(response).perform

    expect(Messages::Facebook::MessageBuilder).to have_received(:new).with(response, page.inbox, outgoing_echo: true)
  end

  it 'ignores the echo of a message Chatwoot sent' do
    allow(GlobalConfigService).to receive(:load).and_call_original
    allow(GlobalConfigService).to receive(:load).with('FB_APP_ID', '').and_return('CHATWOOT_APP')

    described_class.new(event(sender: 'PAGE1', recipient: 'PSID1', echo: true, app_id: 'CHATWOOT_APP')).perform

    expect(Messages::Facebook::MessageBuilder).not_to have_received(:new)
  end
end
