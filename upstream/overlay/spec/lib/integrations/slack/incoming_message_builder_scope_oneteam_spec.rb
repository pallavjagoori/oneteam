require 'rails_helper'

# OneTeam coverage for Slack replies arriving after the Slack app lost a
# permission: the integration is disabled and the admin is asked to
# reconnect it. Also covers files that are neither images nor videos.
describe Integrations::Slack::IncomingMessageBuilder do
  let(:account) { create(:account) }
  let(:message_params) { slack_message_stub }
  let(:builder) { described_class.new(message_params) }
  let(:slack_client) { instance_double(Slack::Web::Client) }
  let!(:hook) { create(:integrations_hook, account: account, reference_id: message_params[:event][:channel]) }

  before do
    create(:conversation, account: account, identifier: message_params[:event][:thread_ts])
    allow(builder).to receive(:slack_client).and_return(slack_client)
    allow(slack_client).to receive(:users_info).and_raise(Slack::Web::Api::Errors::MissingScope.new('missing_scope'))
  end

  it 'disables the integration and asks for reauthorization when a scope is missing' do
    builder.perform

    expect(hook.reload.status).to eq('disabled')
    expect(hook.reauthorization_required?).to be(true)
  end

  it 'treats other files as generic attachments' do
    expect(builder.file_type({ filetype: 'pdf', mimetype: 'application/pdf' })).to eq(:file)
  end
end
