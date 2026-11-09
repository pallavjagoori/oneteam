require 'rails_helper'

# OneTeam coverage for building the LINE API client from channel credentials.
RSpec.describe Channel::Line do
  it 'configures the client with the channel credentials' do
    channel = described_class.new(line_channel_id: 'cid', line_channel_secret: 'secret', line_channel_token: 'token')

    expect(channel.client).to be_a(Line::Bot::Client)
    expect(channel.client.channel_id).to eq('cid')
  end
end
