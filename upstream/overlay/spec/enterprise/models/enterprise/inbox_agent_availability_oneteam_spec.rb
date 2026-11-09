require 'rails_helper'

# Inbox defines its own member_ids_with_assignment_capacity, so the enterprise
# module version is reached here by binding it directly.
RSpec.describe Enterprise::InboxAgentAvailability do
  let(:inbox) { create(:inbox) }
  let(:agent) { create(:user, account: inbox.account, role: :agent) }
  let(:capacity) { described_class.instance_method(:member_ids_with_assignment_capacity) }

  before { create(:inbox_member, inbox: inbox, user: agent) }

  it 'returns all member ids when capacity filtering is off' do
    expect(capacity.bind_call(inbox)).to eq([agent.id])
  end

  it 'keeps only online agents with capacity when filtering is on' do
    allow(inbox).to receive(:capacity_filtering_enabled?).and_return(true)
    allow(OnlineStatusTracker).to receive(:get_available_users).and_return({ agent.id.to_s => 'online' })
    capacity_service = instance_double(Enterprise::AutoAssignment::CapacityService, agent_has_capacity?: true)
    allow(Enterprise::AutoAssignment::CapacityService).to receive(:new).and_return(capacity_service)

    expect(capacity.bind_call(inbox)).to eq([agent.id])
  end
end
