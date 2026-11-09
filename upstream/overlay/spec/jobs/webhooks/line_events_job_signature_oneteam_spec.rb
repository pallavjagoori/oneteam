require 'rails_helper'

# OneTeam coverage for LINE webhooks whose signature does not match.
RSpec.describe Webhooks::LineEventsJob do
  it 'drops events with an invalid signature' do
    channel = create(:channel_line)
    allow(Line::IncomingMessageService).to receive(:new)

    described_class.perform_now(params: { line_channel_id: channel.line_channel_id }, signature: 'bad', post_body: '{}')

    expect(Line::IncomingMessageService).not_to have_received(:new)
  end
end
