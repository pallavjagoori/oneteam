require 'rails_helper'

# OneTeam coverage: a conversation's Liquid id is its per-account display id,
# not the database id.
RSpec.describe ConversationDrop do
  it 'uses the display id as the id' do
    conversation = create(:conversation)

    expect(described_class.new(conversation).id).to eq(conversation.display_id)
  end
end
