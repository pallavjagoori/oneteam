require 'rails_helper'

# OneTeam coverage for the email an automation rule sends to every member
# of a team about a conversation, with the rule's custom message.
RSpec.describe TeamNotifications::AutomationNotificationMailer do
  let(:account) { create(:account) }
  let(:team) { create(:team, account: account) }
  let(:agents) { create_list(:user, 2, account: account) }
  let(:conversation) { create(:conversation, account: account) }

  before do
    agents.each { |agent| create(:team_member, team: team, user: agent) }
  end

  it 'emails the team with the custom message and a link to the conversation' do
    allow_any_instance_of(described_class).to receive(:smtp_config_set_or_development?).and_return(true) # rubocop:disable RSpec/AnyInstance

    mail = described_class.conversation_creation(conversation, team, 'Please check this VIP')

    expect(mail.to).to match_array(agents.map(&:email))
    expect(mail.subject).to eq('This email has been sent via automation rule actions.')
    expect(mail.body.encoded).to include('Please check this VIP').and include("/conversations/#{conversation.display_id}")
  end

  it 'sends nothing without SMTP settings' do
    allow_any_instance_of(described_class).to receive(:smtp_config_set_or_development?).and_return(false) # rubocop:disable RSpec/AnyInstance

    expect(described_class.conversation_creation(conversation, team, 'Hi').message).to be_a(ActionMailer::Base::NullMail)
  end
end
