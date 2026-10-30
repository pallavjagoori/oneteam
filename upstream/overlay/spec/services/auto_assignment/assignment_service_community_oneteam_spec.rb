require 'rails_helper'

# OneTeam coverage for the community edition of auto-assignment v2, which
# enterprise replaces (it adds capacity limits and exclusion rules). Open
# unassigned conversations are taken oldest first, or longest waiting
# first when the policy says so; a conversation with a team only goes to
# that team's members, and not at all when the team has auto-assign off.
RSpec.describe AutoAssignment::AssignmentService do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account, enable_auto_assignment: true) }
  let(:policy) { create(:assignment_policy, account: account, conversation_priority: :longest_waiting) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:teammate) { create(:user, account: account, role: :agent) }
  let(:service) do
    community_edition_of(described_class, :unassigned_conversations, :find_available_agent, :round_robin_selector).new(inbox: inbox)
  end
  let(:rate_limiter) { instance_double(AutoAssignment::RateLimiter, within_limit?: true, track_assignment: true) }

  before do
    account.enable_features('assignment_v2')
    account.save!
    create(:inbox_assignment_policy, inbox: inbox, assignment_policy: policy)
    [agent, teammate].each { |user| create(:inbox_member, inbox: inbox, user: user) }
    allow(OnlineStatusTracker).to receive(:get_available_users).and_return({ agent.id.to_s => 'online', teammate.id.to_s => 'online' })
    allow(AutoAssignment::RateLimiter).to receive(:new).and_return(rate_limiter)
  end

  def unassigned(**attributes)
    create(:conversation, inbox: inbox, account: account, **attributes).tap { |c| c.update!(assignee: nil) }
  end

  it 'assigns the longest waiting conversation first' do
    newer = unassigned
    waiting = unassigned
    waiting.update_column(:last_activity_at, 2.hours.ago) # rubocop:disable Rails/SkipsModelValidations

    expect(service.perform_bulk_assignment(limit: 1)).to eq(1)

    expect(waiting.reload.assignee).to be_present
    expect(newer.reload.assignee).to be_nil
  end

  it 'takes the oldest conversation first without a waiting-time policy' do
    policy.update!(conversation_priority: :earliest_created)
    oldest = unassigned
    unassigned

    service.perform_bulk_assignment(limit: 1)

    expect(oldest.reload.assignee).to be_present
  end

  it 'only picks members of the conversation team' do
    team = create(:team, account: account, allow_auto_assign: true)
    create(:team_member, team: team, user: teammate)
    conversation = unassigned(team: team)

    service.perform_bulk_assignment

    expect(conversation.reload.assignee).to eq(teammate)
  end

  it 'leaves team conversations alone when the team has auto-assign off' do
    conversation = unassigned(team: create(:team, account: account, allow_auto_assign: false))

    expect(service.perform_bulk_assignment).to eq(0)
    expect(conversation.reload.assignee).to be_nil
  end

  it 'assigns nobody when every agent is at their limit' do
    allow(rate_limiter).to receive(:within_limit?).and_return(false)
    conversation = unassigned

    expect(service.perform_bulk_assignment).to eq(0)
    expect(conversation.reload.assignee).to be_nil
  end
end
