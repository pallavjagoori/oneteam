require 'rails_helper'

# OneTeam coverage for the messages resource of Copilot's get_data tool. It
# reads only customer and agent messages (notes included) in conversations
# the user can open, and limits text search to the dashboard's search window
# unless the model gives dates or starts from a saved set.
RSpec.describe Captain::Copilot::Resources::Messages do
  subject(:resource) { described_class.new(account: account, user: admin) }

  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:conversation) { create(:conversation, account: account) }
  let(:as_of) { Time.current }
  let!(:customer_message) do
    create(:message, conversation: conversation, account: account, message_type: :incoming, sender: conversation.contact,
                     content: 'Order ORD-123 is late')
  end
  let!(:agent_note) do
    create(:message, conversation: conversation, account: account, message_type: :outgoing, sender: admin, private: true, content: 'Ask the courier')
  end
  let!(:bot_reply) do
    create(:message, conversation: conversation, account: account, message_type: :outgoing, sender: create(:captain_assistant, account: account),
                     content: 'Checking ORD-123')
  end

  before { create(:message, conversation: conversation, account: account, message_type: :activity, content: 'Conversation was resolved') }

  def matching(filters = nil, source: nil, **keyword_filters)
    normalized = resource.normalize(filters || keyword_filters, source: source)
    resource.matching(normalized, as_of: as_of, source: source)
  end

  it 'reads customer, agent and bot messages but not activity messages' do
    expect(matching({})).to contain_exactly(customer_message, agent_note, bot_reply)
  end

  it 'filters by sender role, privacy and text' do
    expect(matching(sender: 'customer')).to contain_exactly(customer_message)
    expect(matching(sender: 'agent')).to contain_exactly(agent_note)
    expect(matching(sender: 'bot')).to contain_exactly(bot_reply)
    expect(matching(sender: 'system')).to be_empty
    expect(matching(private: true)).to contain_exactly(agent_note)
    expect(matching(private: false)).to contain_exactly(customer_message, bot_reply)
    expect(matching(contains: 'ord-123')).to contain_exactly(customer_message, bot_reply)
  end

  it 'limits text search to the search window when no dates are given, and says so' do
    customer_message.update_column(:created_at, (Limits.search_time_range_limit_days + 1).days.ago) # rubocop:disable Rails/SkipsModelValidations

    expect(matching(contains: 'ORD-123')).to contain_exactly(bot_reply)
    expect(resource.note).to start_with('Only messages sent since')
  end

  it 'searches every date when dates or a saved set are given' do
    customer_message.update_column(:created_at, (Limits.search_time_range_limit_days + 1).days.ago) # rubocop:disable Rails/SkipsModelValidations
    source = instance_double(CopilotRun::Collection, resource: 'conversations', record_ids: [conversation.id])

    expect(matching({ contains: 'ORD-123' }, source: source)).to contain_exactly(customer_message, bot_reply)
    expect(matching(contains: 'ORD-123', since: 1.year.ago.iso8601)).to contain_exactly(customer_message, bot_reply)
    expect(resource.note).to be_nil
  end

  it 'narrows a saved set of messages' do
    source = instance_double(CopilotRun::Collection, resource: 'messages', record_ids: [agent_note.id, bot_reply.id])

    expect(matching({ private: true }, source: source)).to contain_exactly(agent_note)
  end

  it 'counts by sender role and by privacy' do
    filters = resource.normalize({})
    relation = resource.matching(filters, as_of: as_of)

    expect(resource.group_counts(relation, filters, as_of, 'sender'))
      .to contain_exactly({ group: 'customer', count: 1 }, { group: 'agent', count: 1 }, { group: 'bot', count: 1 })
    expect(resource.group_counts(relation, filters, as_of, 'private')).to contain_exactly({ group: 'false', count: 2 }, { group: 'true', count: 1 })
  end

  it 'shows the sender role, date and a squished excerpt' do
    customer_message.update!(content: "Line one\n\n#{'x' * 200}")

    row = resource.rows([customer_message.id]).first

    expect(row[:label]).to eq("##{conversation.display_id}")
    expect(row[:values][0..1]).to eq(['customer', customer_message.created_at.to_date])
    expect(row[:values][2]).to start_with('Line one x').and(have_attributes(length: 160))
  end
end
