require 'rails_helper'

# OneTeam coverage for `rake assignment_v2:migrate`, which turns each inbox's
# old "max assignment limit" setting into an agent capacity policy for the
# new assignment system.
RSpec.describe 'assignment_v2:migrate' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:inbox) { create(:inbox, account: account, auto_assignment_config: { 'max_assignment_limit' => 5 }) }

  def migrate(account_id, input: '')
    with_modified_env ACCOUNT_ID: account_id&.to_s do
      run_rake('assignment_v2:migrate', input: input)
    end
  end

  it 'creates a capacity policy from the inbox limit and gives it to inbox members' do
    create(:inbox_member, inbox: inbox, user: agent)

    output = migrate(account.id).output

    policy = AgentCapacityPolicy.find_by!(account: account, name: 'Auto Assignment Capacity')
    expect(InboxCapacityLimit.find_by!(agent_capacity_policy: policy, inbox: inbox).conversation_limit).to eq(5)
    expect(agent.account_users.first.reload.agent_capacity_policy_id).to eq(policy.id)
    expect(output).to include("Account #{account.id} — migrated", 'Migrated: 1, Skipped: 0, Errored: 0')
  end

  it 'does not add the same inbox limit twice' do
    inbox
    migrate(account.id)

    expect { migrate(account.id) }.not_to change(InboxCapacityLimit, :count)
  end

  it 'skips accounts without inbox limits' do
    expect(migrate(account.id).output).to include('skipped (no inboxes with limit)')
  end

  it 'reports accounts that fail' do
    inbox
    allow(AgentCapacityPolicy).to receive(:find_or_create_by!).and_raise(StandardError, 'boom')

    expect(migrate(account.id).output).to include("Account #{account.id} — error: boom")
  end

  it 'needs an existing account' do
    result = migrate(0)

    expect(result.output).to include('Account with ID 0 not found')
    expect(result.status).to eq(1)
  end

  it 'asks before migrating every account' do
    expect(migrate(nil, input: "n\n").output).to include('Aborted.')
    expect(migrate(nil, input: "y\n").output).to include('Done!')
  end
end
