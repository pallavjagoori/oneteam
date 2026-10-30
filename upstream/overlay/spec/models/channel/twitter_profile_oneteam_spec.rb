require 'rails_helper'

# OneTeam coverage for removing a Twitter (X) inbox: Chatwoot first asks
# Twitter to stop sending the profile's events, using the app keys and the
# profile's tokens, and still deletes the channel when that call fails.
RSpec.describe Channel::TwitterProfile do
  let(:channel) { create(:channel_twitter_profile) }
  let(:twitter) { instance_double(Twitty::Facade) }

  before { allow(Rails.logger).to receive(:info) }

  it 'builds the Twitter client from the app keys and profile tokens' do
    config = Struct.new(:consumer_key, :consumer_secret, :access_token, :access_token_secret, :base_url, :environment).new
    allow(Twitty::Facade).to receive(:new).and_yield(config).and_return(twitter)

    with_modified_env TWITTER_CONSUMER_KEY: 'key', TWITTER_CONSUMER_SECRET: 'secret', TWITTER_ENVIRONMENT: 'prod' do
      channel.twitter_client
    end

    expect(config.to_h).to eq(consumer_key: 'key', consumer_secret: 'secret', access_token: channel.twitter_access_token,
                              access_token_secret: channel.twitter_access_token_secret, base_url: 'https://api.twitter.com',
                              environment: 'prod')
  end

  it 'unsubscribes the profile before it is deleted' do
    allow(Twitty::Facade).to receive(:new).and_return(twitter)
    expect(twitter).to receive(:remove_subscription).with(user_id: channel.profile_id).and_return(double(body: 'ok')) # rubocop:disable RSpec/VerifiedDoubles

    channel.destroy!

    expect(Rails.logger).to have_received(:info).with('TWITTER_UNSUBSCRIBE: ok')
  end

  it 'still deletes the channel when Twitter refuses' do
    allow(Twitty::Facade).to receive(:new).and_return(twitter)
    allow(twitter).to receive(:remove_subscription).and_raise(StandardError, 'expired token')
    allow(Rails.logger).to receive(:error)

    channel.destroy!

    expect(described_class.exists?(channel.id)).to be(false)
  end
end
