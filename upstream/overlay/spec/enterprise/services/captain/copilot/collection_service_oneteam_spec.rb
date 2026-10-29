require 'rails_helper'

# OneTeam coverage for get_data's saved selections. A collection keeps the
# exact total, newest-first IDs up to the selection limit, optional counts
# per group, and a note when the resource chose a date range. A replayed
# tool call finds the collection it already saved.
RSpec.describe Captain::Copilot::CollectionService do
  subject(:service) { described_class.new(turn, tool_call: tool_call, token: turn.lease_token) }

  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: admin) }
  let(:tool_call) { turn.tool_calls.create!(call_id: 'get', name: 'get_data', status: :running) }
  let!(:conversations) { create_list(:conversation, 3, account: account) }

  it 'saves the selection and reports the total' do
    result = service.create(resource: 'conversations', filters: { status: 'open' })

    collection = CopilotRun::Collection.find(result[:collection_id])
    expect(result).to include(resource: 'conversations', total: 3, selected: 3, selection_truncated: false)
    expect(collection.selected_ids).to match_array(conversations.map(&:id))
    expect(collection.copilot_tool_call).to eq(tool_call)
  end

  it 'counts per group over the newest records only when newest is given' do
    conversations.first.update!(status: :resolved)

    result = service.create(resource: 'conversations', filters: { newest: 2 }, group_by: 'status')

    expect(result).to include(total: 2, group_by: 'status')
    expect(result[:groups].sum { |group| group[:count] }).to eq(2)
  end

  it 'marks a selection cut at the limit' do
    stub_const('CopilotRun::MAX_SELECTION', 2)

    result = service.create(resource: 'conversations', filters: {})

    expect(result).to include(total: 3, selected: 2, selection_truncated: true)
  end

  it 'starts from a saved set, which keeps its cut-off' do
    source = copilot_collection(turn, [conversations.first.id], truncated: true)

    result = service.create(resource: 'contacts', filters: {}, from: source.id)

    expect(result).to include(total: 1, selection_truncated: true)
    expect(CopilotRun::Collection.find(result[:collection_id]).source_run).to eq(source)
  end

  it 'passes on the note of a resource' do
    result = service.create(resource: 'messages', filters: { contains: 'refund' })

    expect(result[:note]).to start_with('Only messages sent since')
  end

  it 'returns the same collection when the tool call is replayed' do
    first = service.create(resource: 'conversations', filters: {})

    expect(service.create(resource: 'conversations', filters: {})[:collection_id]).to eq(first[:collection_id])
  end

  it 'requires filters to be an object' do
    expect { service.create(resource: 'conversations', filters: 'open') }.to raise_error(ArgumentError, 'filters must be an object')
  end
end
