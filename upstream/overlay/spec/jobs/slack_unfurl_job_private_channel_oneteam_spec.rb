require 'rails_helper'

# OneTeam coverage for Slack unfurl events from channels the bot cannot read.
RSpec.describe SlackUnfurlJob do
  it 'skips the unfurl when Slack cannot find the channel' do
    account = create(:account)
    hook = create(:integrations_hook, account: account, app_id: 'slack')
    client = instance_double(Slack::Web::Client)
    allow(Slack::Web::Client).to receive(:new).and_return(client)
    allow(client).to receive(:conversations_members).and_raise(Slack::Web::Api::Errors::ChannelNotFound.new('channel_not_found'))
    allow(Integrations::Slack::SlackLinkUnfurlService).to receive(:new)

    described_class.perform_now({ event: { channel: 'C1', links: [{ url: "https://app.example/app/accounts/#{account.id}/conversations/1" }] } })

    expect(Slack::Web::Client).to have_received(:new).with(token: hook.access_token)
    expect(Integrations::Slack::SlackLinkUnfurlService).not_to have_received(:new)
  end
end
