require 'rails_helper'

# OneTeam coverage for removing recent conversations whose contact or inbox
# row is gone, for one account or for all of them.
describe Internal::RemoveOrphanConversationsService do
  let(:account) { create(:account) }
  let!(:kept) { create(:conversation, account: account) }
  let!(:no_contact) { create(:conversation, account: account) }
  let!(:no_inbox) { create(:conversation, account: account) }
  let!(:old_orphan) { create(:conversation, account: account, last_activity_at: 3.days.ago) }
  let!(:other_account_orphan) { create(:conversation) }

  before do
    [no_contact, old_orphan, other_account_orphan].each { |c| c.update_column(:contact_id, 0) } # rubocop:disable Rails/SkipsModelValidations
    no_inbox.update_column(:inbox_id, 0) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'deletes recent orphans in the given account only' do
    expect(described_class.new(account: account).perform).to eq(2)

    expect(Conversation.where(id: [no_contact.id, no_inbox.id])).to be_empty
    expect(Conversation.where(id: [kept.id, old_orphan.id, other_account_orphan.id]).count).to eq(3)
  end

  it 'looks across every account and further back when asked' do
    expect(described_class.new(days: 7).perform).to eq(4)

    expect(Conversation.pluck(:id)).to eq([kept.id])
  end
end
