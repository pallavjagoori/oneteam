# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the completion check never stops for an exhausted Captain quota.
RSpec.describe Captain::ConversationCompletionService do
  it 'always has responses available' do
    service = described_class.new(account: create(:account), conversation_display_id: 1)

    expect(service.send(:responses_available?)).to be(true)
  end
end
