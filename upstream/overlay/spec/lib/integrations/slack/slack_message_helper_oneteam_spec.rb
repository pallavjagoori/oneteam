require 'rails_helper'

# OneTeam coverage for Slack replies when the Slack app has lost a scope:
# the hook is disabled and the account is asked to reauthorize.
RSpec.describe Integrations::Slack::SlackMessageHelper do
  let(:host_class) do
    Class.new do
      include Integrations::Slack::SlackMessageHelper

      attr_accessor :params, :integration_hook, :slack_client
    end
  end
  let(:account) { create(:account) }
  let(:conversation) { create(:conversation, account: account, identifier: '1691.0001') }
  let(:hook) { create(:integrations_hook, account: account) }
  let(:slack_client) { instance_double(Slack::Web::Client) }
  let(:helper) do
    host_class.new.tap do |object|
      object.params = { event: { thread_ts: conversation.identifier, ts: '1691.0002', user: 'U1' } }
      object.integration_hook = hook
      object.slack_client = slack_client
    end
  end

  it 'disables the hook and asks for reauthorization when a scope is missing' do
    allow(slack_client).to receive(:users_info).and_raise(Slack::Web::Api::Errors::MissingScope, 'missing_scope')
    allow(hook).to receive(:prompt_reauthorization!)

    helper.process_message_payload

    expect(hook).to have_received(:prompt_reauthorization!)
    expect(hook.reload).to be_disabled
  end

  it 'treats unknown file types as files' do
    expect(helper.file_type({ mimetype: 'application/zip', filetype: 'zip' })).to eq(:file)
  end
end
