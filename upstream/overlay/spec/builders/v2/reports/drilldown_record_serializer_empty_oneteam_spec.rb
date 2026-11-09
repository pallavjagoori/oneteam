require 'rails_helper'

# OneTeam coverage for the drilldown serializer when it has no records to
# look up latest messages for.
describe V2::Reports::DrilldownRecordSerializer do
  it 'has no latest messages without conversation records' do
    serializer = described_class.new(create(:account), 'conversations_count', false)

    expect(serializer.send(:latest_messages_by_conversation_id)).to eq({})
  end
end
