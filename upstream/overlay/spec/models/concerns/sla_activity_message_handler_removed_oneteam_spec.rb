require 'rails_helper'

# OneTeam coverage for the activity message when an SLA is removed from a
# conversation.
RSpec.describe SlaActivityMessageHandler do
  let(:conversation) { create(:conversation) }

  it 'detects a removed SLA policy' do
    allow(conversation).to receive(:previous_changes).and_return({ sla_policy_id: [3, nil] })

    expect(conversation.send(:determine_sla_change_type)).to eq('removed')
  end

  it 'posts the removal activity' do
    allow(Conversations::ActivityMessageJob).to receive(:perform_later)

    conversation.send(:create_sla_change_activity, 'removed', 'Ann')

    expect(Conversations::ActivityMessageJob).to have_received(:perform_later)
      .with(conversation, hash_including(content: I18n.t('conversations.activity.sla.removed', user_name: 'Ann', sla_name: '')))
  end
end
