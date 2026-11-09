require 'rails_helper'

RSpec.describe Conversations::UserMentionJob do
  let(:conversation) { create(:conversation) }
  let(:account) { conversation.account }
  let(:user) { create(:user, account: account) }

  it 'creates a mention for a user who was not mentioned before' do
    expect { described_class.perform_now([user.id], conversation.id, account.id) }.to change(Mention, :count).by(1)
  end

  it 'refreshes the mention time for a user who was already mentioned' do
    mention = Mention.create!(user: user, conversation: conversation, account: account, mentioned_at: 2.days.ago)

    expect { described_class.perform_now([user.id], conversation.id, account.id) }.not_to change(Mention, :count)
    expect(mention.reload.mentioned_at).to be > 1.minute.ago
  end
end
