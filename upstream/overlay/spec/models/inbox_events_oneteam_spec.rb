require 'rails_helper'

# OneTeam coverage for inbox events, which are only sent when
# ENABLE_INBOX_EVENTS is set, and the channels that pass the channel check.
RSpec.describe Inbox do
  before { allow(Rails.configuration.dispatcher).to receive(:dispatch) }

  it 'dispatches created and reauthorization events when enabled' do
    with_modified_env ENABLE_INBOX_EVENTS: 'true' do
      inbox = create(:inbox)
      inbox.send(:dispatch_reauthorization_event, true)

      expect(Rails.configuration.dispatcher).to have_received(:dispatch).with(described_class::INBOX_CREATED, anything, inbox: inbox)
      expect(Rails.configuration.dispatcher).to have_received(:dispatch)
        .with(described_class::INBOX_UPDATED, anything, inbox: inbox, changed_attributes: { reauthorization_required: [false, true] })
    end
  end

  it 'accepts email, API and website channels' do
    expect(build(:inbox, channel: build(:channel_api)).send(:check_channel_type?)).to be(true)
  end
end
