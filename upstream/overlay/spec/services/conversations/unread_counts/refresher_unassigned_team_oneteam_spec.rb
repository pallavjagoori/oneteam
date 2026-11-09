require 'rails_helper'

RSpec.describe Conversations::UnreadCounts::Refresher do
  it 'uses the unassigned team inbox key when there is no assignee' do
    conversation = create(:conversation)
    refresher = described_class.new(conversation)
    expected = refresher.send(:store).team_inbox_unassigned_key(conversation.account_id, 5, conversation.inbox_id)

    expect(refresher.send(:team_assignment_key_for, 5, conversation.inbox_id, nil)).to eq(expected)
  end
end
