require 'rails_helper'

# OneTeam coverage for subscribing an Instagram account to webhooks and
# removing that subscription: network errors are logged and never stop the
# channel from being created or deleted.
RSpec.describe Channel::Instagram do
  let(:channel) { create(:channel_instagram) }

  it 'unsubscribes from webhooks before it is deleted' do
    channel.destroy!

    expect(a_request(:delete, %r{graph\.instagram\.com/.+/#{channel.instagram_id}/subscribed_apps})).to have_been_made
  end

  it 'ignores network errors while subscribing and unsubscribing' do
    allow(HTTParty).to receive(:post).and_raise(SocketError, 'offline')
    allow(HTTParty).to receive(:delete).and_raise(SocketError, 'offline')

    expect(channel.subscribe).to be(true)
    expect(channel.unsubscribe).to be(true)
  end
end
