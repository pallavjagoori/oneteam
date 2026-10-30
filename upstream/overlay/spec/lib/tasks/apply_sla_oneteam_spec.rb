require 'rails_helper'

# OneTeam coverage for `rake sla:apply_to_conversations`, a development-only
# task that attaches an SLA policy to an account's conversations that have
# none.
RSpec.describe 'sla:apply_to_conversations' do # rubocop:disable RSpec/DescribeClass
  let(:account) { create(:account) }
  let(:sla_policy) { create(:sla_policy, account: account) }

  def apply_sla(*)
    run_rake('sla:apply_to_conversations', *)
  end

  it 'only runs in development' do
    result = apply_sla(sla_policy.id, account.id)

    expect(result.output).to include('can only be run in the development environment')
    expect(result.status).to eq(1)
  end

  context 'when running in development' do
    before { allow(Rails.env).to receive(:development?).and_return(true) }

    it 'applies the policy to conversations without one' do
      conversations = create_list(:conversation, 2, account: account)

      result = apply_sla(sla_policy.id, account.id, '10')

      expect(conversations.map { |conversation| conversation.reload.sla_policy_id }).to all(eq(sla_policy.id))
      expect(result.output).to include('Successfully processed: 2 conversations', 'Average time per conversation')
    end

    it 'reports conversations it could not update' do
      conversation = create(:conversation, account: account)
      allow_any_instance_of(Conversation).to receive(:update!).and_raise(StandardError, 'locked') # rubocop:disable RSpec/AnyInstance

      result = apply_sla(sla_policy.id, account.id)

      expect(result.output).to include("Error applying SLA to conversation #{conversation.id}: locked", 'Errors encountered: 1')
    end

    it 'stops when every conversation already has a policy' do
      result = apply_sla(sla_policy.id, account.id)

      expect(result.output).to include('No conversations found without SLA policy')
      expect(result.status).to eq(0)
    end

    it 'needs a policy id and an account id' do
      expect(apply_sla.output).to include('SLA_POLICY_ID is required')
      expect(apply_sla(sla_policy.id).output).to include('ACCOUNT_ID is required')
    end

    it 'needs an existing account and a policy of that account' do
      expect(apply_sla(sla_policy.id, 0).output).to include('Account with ID 0 not found')
      expect(apply_sla(create(:sla_policy).id, account.id).output).to include("not found for Account #{account.id}")
    end
  end
end
