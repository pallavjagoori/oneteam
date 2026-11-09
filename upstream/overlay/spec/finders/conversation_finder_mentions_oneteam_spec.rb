require 'rails_helper'

# OneTeam coverage for the "mentions" conversation filter, and the SLA
# preloads enterprise adds when the account has the SLA feature.
describe ConversationFinder do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:inbox) { create(:inbox, account: account) }
  let!(:mentioned) { create(:conversation, account: account, inbox: inbox) }

  before do
    create(:conversation, account: account, inbox: inbox)
    create(:mention, account: account, conversation: mentioned, user: user)
    Current.account = account
  end

  it 'lists only conversations where the user is mentioned' do
    result = described_class.new(user, { status: 'open', assignee_type: 'all', conversation_type: 'mention' }).perform

    expect(result[:conversations].map(&:id)).to eq([mentioned.id])
  end

  it 'preloads SLA data when the account has the SLA feature' do
    account.enable_features!('sla')

    result = described_class.new(user, { status: 'open', assignee_type: 'all' }).perform

    expect(result[:conversations].map(&:id)).to include(mentioned.id)
  end
end
