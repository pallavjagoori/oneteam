require 'rails_helper'

# OneTeam coverage for Facebook page webhook subscriptions: errors from
# Facebook are logged and never block creating or removing the inbox.
RSpec.describe Channel::FacebookPage do
  let(:channel) { create(:channel_facebook_page) }

  before { stub_request(:any, /graph\.facebook\.com/) }

  it 'ignores errors while subscribing and unsubscribing' do
    allow(Facebook::Messenger::Subscriptions).to receive(:subscribe).and_raise(StandardError, 'expired token')
    allow(Facebook::Messenger::Subscriptions).to receive(:unsubscribe).and_raise(StandardError, 'expired token')

    expect(channel.subscribe).to be(true)
    expect(channel.unsubscribe).to be(true)
  end

  it 'unsubscribes the page' do
    allow(Facebook::Messenger::Subscriptions).to receive(:unsubscribe).and_return(true)

    channel.unsubscribe

    expect(Facebook::Messenger::Subscriptions).to have_received(:unsubscribe).with(access_token: channel.page_access_token)
  end
end
