require 'rails_helper'

# OneTeam coverage for follow-up instrumentation without a conversation: the
# channel type comes from the follow-up context.
RSpec.describe Captain::FollowUpService do
  it 'reports the context channel type and its event name' do
    service = described_class.new(account: create(:account), follow_up_context: { 'channel_type' => 'Channel::Api' }, user_message: 'shorter')

    expect(service.send(:instrumentation_metadata)).to eq(channel_type: 'Channel::Api')
    expect(service.send(:event_name)).to eq('follow_up')
  end
end
