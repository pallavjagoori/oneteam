require 'rails_helper'

# OneTeam coverage for connecting Slack: the OAuth code is exchanged for a
# bot token and saved on a new, disabled hook (enabled once a channel is
# picked). Chatwoot's spec stubs the exchange; this pins the request.
RSpec.describe Integrations::Slack::HookBuilder do
  let(:account) { create(:account) }

  # The redirect URI is built from the current account, as in a request.
  around do |example|
    Current.account = account
    example.run
  ensure
    Current.reset
  end

  before do
    stub_request(:post, 'https://slack.com/api/oauth.v2.access')
      .to_return(status: 200, headers: { 'Content-Type' => 'application/json' }, body: { ok: true, access_token: 'xoxb-new' }.to_json)
  end

  it 'exchanges the code with the app credentials and saves the token on a disabled account hook' do
    hook = described_class.new(account: account, code: 'abc').perform

    expect(hook).to have_attributes(access_token: 'xoxb-new', status: 'disabled', app_id: 'slack', inbox_id: nil, hook_type: 'account')
    expect(a_request(:post, 'https://slack.com/api/oauth.v2.access').with(
             body: hash_including('client_id' => 'TEST_CLIENT_ID', 'client_secret' => 'TEST_CLIENT_SECRET', 'code' => 'abc',
                                  'redirect_uri' => Integrations::App.slack_integration_url)
           )).to have_been_made
  end

  # The builder's own hook_type method is never called: the hook type comes
  # from the Slack app's config, so it stays `account` (see UNREACHABLE.md).
  it 'keeps the inbox but still makes an account hook when an inbox is given' do
    inbox = create(:inbox, account: account)

    hook = described_class.new(account: account, code: 'abc', inbox_id: inbox.id).perform

    expect(hook).to have_attributes(inbox_id: inbox.id, hook_type: 'account')
  end
end
