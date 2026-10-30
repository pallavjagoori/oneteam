require 'rails_helper'

# OneTeam coverage for Instagram webhook entries that skip the normal message
# path: Meta's dashboard test events, and processing without the per-contact
# lock once lock retries run out.
RSpec.describe Webhooks::InstagramEventsJob do
  it 'hands dashboard test events to the test event service' do
    service = instance_double(Instagram::TestEventService, perform: true)
    allow(Instagram::TestEventService).to receive(:new).and_return(service)
    entry = { id: 'ig-1', changes: [{ field: 'messages', value: { sender: { id: '12' }, message: { text: 'hi' } } }] }

    described_class.new.process_entries([entry])

    expect(Instagram::TestEventService).to have_received(:new).with(hash_including('sender' => { 'id' => '12' }))
  end

  it 'ignores test events without a payload' do
    allow(Instagram::TestEventService).to receive(:new)

    described_class.new.process_entries([{ id: 'ig-1', changes: [{}] }])

    expect(Instagram::TestEventService).not_to have_received(:new)
  end

  it 'processes entries without the lock after retries run out' do
    job = described_class.new
    allow(job).to receive(:process_entries)
    allow(Rails.logger).to receive(:warn)

    job.process_without_lock([{ id: 'ig-1' }])

    expect(job).to have_received(:process_entries).with([{ id: 'ig-1' }])
    expect(Rails.logger).to have_received(:warn).with('[Webhooks::InstagramEventsJob] Processing without lock after lock retry exhaustion')
  end
end
