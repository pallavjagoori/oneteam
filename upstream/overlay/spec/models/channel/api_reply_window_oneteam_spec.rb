require 'rails_helper'

# OneTeam coverage: an API channel's agent reply time window must be a
# positive number of hours when it is set.
RSpec.describe Channel::Api do
  it 'rejects a reply time window that is not positive' do
    channel = build(:channel_api, additional_attributes: { 'agent_reply_time_window' => '0' })

    expect(channel).not_to be_valid
    expect(channel.errors[:agent_reply_time_window]).to include('agent_reply_time_window must be greater than 0')
  end

  it 'accepts a positive reply time window' do
    channel = build(:channel_api, additional_attributes: { 'agent_reply_time_window' => '24' })
    channel.validate

    expect(channel.errors[:agent_reply_time_window]).to be_empty
  end
end
