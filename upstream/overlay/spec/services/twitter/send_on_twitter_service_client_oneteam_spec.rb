require 'rails_helper'

# OneTeam coverage for the Twitter client setup and failed tweet replies.
RSpec.describe Twitter::SendOnTwitterService do
  let(:account) { create(:account) }
  let(:twitter_channel) { create(:channel_twitter_profile, account: account) }
  let(:twitter_inbox) { create(:inbox, channel: twitter_channel, account: account) }
  let(:contact) { create(:contact, account: account, additional_attributes: { screen_name: 'test_user' }) }
  let(:contact_inbox) { create(:contact_inbox, contact: contact, inbox: twitter_inbox) }
  let(:conversation) do
    create(:conversation, contact: contact, inbox: twitter_inbox, contact_inbox: contact_inbox,
                          additional_attributes: { type: 'tweet', tweet_id: '1234' })
  end
  let(:message) { create(:message, message_type: 'outgoing', inbox: twitter_inbox, account: account, conversation: conversation) }

  it 'builds a client from the channel tokens' do
    client = described_class.new(message: message).send(:twitter_client)

    expect(client).to be_a(Twitty::Facade)
  end

  it 'logs a failed tweet reply and keeps the message without a source id' do
    create(:message, message_type: 'incoming', inbox: twitter_inbox, account: account, conversation: conversation, sender: contact)
    client = instance_double(Twitty::Facade)
    response = instance_double(Twitty::Response, status: '403', body: { 'error' => 'forbidden' })
    allow(Twitty::Facade).to receive(:new).and_return(client)
    allow(client).to receive(:send_tweet_reply).and_return(response)
    allow(Rails.logger).to receive(:error)

    described_class.new(message: message).perform

    expect(Rails.logger).to have_received(:error).with(/TWITTER_TWEET_REPLY_ERROR/)
    expect(message.reload.source_id).to be_nil
  end
end
