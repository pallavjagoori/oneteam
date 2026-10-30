require 'rails_helper'

# OneTeam coverage for the scheduled housekeeping jobs that only hand off to
# a service or another job: removing stale contact inboxes and orphaned
# conversations, and dispatching conversation monitors (enterprise only).
RSpec.describe 'Internal housekeeping jobs' do # rubocop:disable RSpec/DescribeClass
  it 'removes stale contact inboxes' do
    service = instance_double(Internal::RemoveStaleContactInboxesService, perform: true)
    allow(Internal::RemoveStaleContactInboxesService).to receive(:new).and_return(service)

    Internal::RemoveStaleContactInboxesJob.perform_now

    expect(service).to have_received(:perform)
  end

  it 'removes orphaned conversations' do
    service = instance_double(Internal::RemoveOrphanConversationsService, perform: 0)
    allow(Internal::RemoveOrphanConversationsService).to receive(:new).and_return(service)

    Internal::RemoveOrphanConversationsJob.perform_now

    expect(service).to have_received(:perform)
  end

  it 'dispatches conversation monitors on enterprise installs only' do
    expect { Internal::DispatchConversationMonitorsJob.perform_now }.to have_enqueued_job(ConversationMonitors::DispatchJob)

    allow(ChatwootApp).to receive(:enterprise?).and_return(false)
    expect { Internal::DispatchConversationMonitorsJob.perform_now }.not_to have_enqueued_job(ConversationMonitors::DispatchJob)
  end
end
