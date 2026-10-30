require 'rails_helper'

# OneTeam coverage for the rules on which messages Copilot reads and how it
# names their senders (customer, agent, bot or system).
RSpec.describe Captain::Copilot::ReadableMessages do
  it 'maps sender types to roles' do
    expect(described_class.role_for('Contact')).to eq('customer')
    expect(described_class.role_for('User')).to eq('agent')
    expect(described_class.role_for('AgentBot')).to eq('bot')
    expect(described_class.role_for(nil)).to eq('system')
  end

  it 'reads messages up to a point in time' do
    conversation = create(:conversation)
    old = create(:message, conversation: conversation, created_at: 2.days.ago)
    create(:message, conversation: conversation)

    expect(described_class.scope(conversation.messages, as_of: 1.day.ago)).to contain_exactly(old)
  end
end
