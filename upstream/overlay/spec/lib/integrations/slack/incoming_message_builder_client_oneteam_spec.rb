# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the Slack client uses the hook's access token.
RSpec.describe Integrations::Slack::IncomingMessageBuilder do
  it 'builds a Slack client with the hook token' do
    builder = described_class.new({})
    builder.instance_variable_set(:@integration_hook, instance_double(Integrations::Hook, access_token: 'xoxb-1'))

    expect(builder.send(:slack_client).token).to eq('xoxb-1')
  end
end
