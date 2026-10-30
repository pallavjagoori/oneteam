require 'rails_helper'

# OneTeam coverage for picking the Slack channel a Slack integration posts
# to. Channels are listed private first, then public, following Slack's
# pagination cursor; picking a public channel joins it first.
RSpec.describe Integrations::Slack::ChannelBuilder do
  let(:hook) { create(:integrations_hook, account: create(:account), access_token: 'xoxb-1', status: 'disabled') }
  let(:builder) { described_class.new(hook: hook) }
  let(:list_url) { 'https://slack.com/api/conversations.list' }

  def channels_page(channels, next_cursor: '')
    { status: 200, headers: { 'Content-Type' => 'application/json' },
      body: { ok: true, channels: channels, response_metadata: { next_cursor: next_cursor } }.to_json }
  end

  before do
    stub_request(:post, list_url).with(body: hash_including('types' => 'private_channel'))
                                 .to_return(channels_page([{ id: 'G1', name: 'secret', is_private: true }]))
    stub_request(:post, list_url).with(body: hash_including('types' => 'public_channel'))
                                 .to_return(channels_page([{ id: 'C1', name: 'general', is_private: false }], next_cursor: 'next'))
    stub_request(:post, list_url).with(body: hash_including('types' => 'public_channel', 'cursor' => 'next'))
                                 .to_return(channels_page([{ id: 'C2', name: 'random', is_private: false }]))
    stub_request(:post, 'https://slack.com/api/conversations.join').to_return(channels_page([]))
  end

  it 'lists private channels, then every page of public channels, skipping archived ones' do
    expect(builder.fetch_channels.pluck('id')).to eq(%w[G1 C1 C2])
    expect(a_request(:post, list_url).with(body: hash_including('exclude_archived' => 'true', 'limit' => '1000'))).to have_been_made.times(3)
    expect(a_request(:post, list_url).with(headers: { 'Authorization' => 'Bearer xoxb-1' })).to have_been_made.times(3)
  end

  it 'joins a public channel and enables the hook on it' do
    expect(builder.update('C2')).to eq(hook)

    expect(hook.reload).to have_attributes(reference_id: 'C2', status: 'enabled')
    expect(hook.settings['channel_name']).to eq('random')
    expect(a_request(:post, 'https://slack.com/api/conversations.join').with(body: { 'channel' => 'C2' })).to have_been_made
  end

  it 'uses a private channel without joining it' do
    builder.update('G1')

    expect(hook.reload.reference_id).to eq('G1')
    expect(a_request(:post, 'https://slack.com/api/conversations.join')).not_to have_been_made
  end

  it 'does nothing for an unknown channel' do
    expect(builder.update('C404')).to be_nil
    expect(hook.reload.status).to eq('disabled')
  end
end
