require 'rails_helper'

# OneTeam coverage for the message search filters that advanced search adds
# when the full-text index is used through Postgres (GIN): filtering by
# sender ("from=contact:12" or "agent:3") and by inbox, which an agent may
# only use for inboxes they belong to. Enterprise replaces the sender and
# inbox helpers for OpenSearch, so the community versions are restored here.
RSpec.describe SearchService do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:inbox) { create(:inbox, account: account) }
  let(:other_inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let!(:from_contact) do
    create(:message, account: account, inbox: inbox, conversation: conversation, content: 'refund please', sender: conversation.contact)
  end
  let!(:from_agent) do
    create(:message, account: account, inbox: inbox, conversation: conversation, content: 'refund issued', sender: agent, message_type: :outgoing)
  end

  before do
    create(:inbox_member, inbox: inbox, user: agent)
    account.enable_features!('advanced_search', 'search_with_gin')
    Current.account = account
  end

  after { Current.reset }

  def search(params)
    community_edition_of(described_class, :parse_from_param, :validate_inbox_access).new(current_user: agent, current_account: account,
                                                                                         params: params, search_type: 'Message').perform[:messages]
  end

  it 'filters by contact or agent sender' do
    expect(search(q: 'refund', from: "contact:#{conversation.contact.id}")).to contain_exactly(from_contact)
    expect(search(q: 'refund', from: "agent:#{agent.id}")).to contain_exactly(from_agent)
    expect(search(q: 'refund', from: 'robot:1')).to contain_exactly(from_contact, from_agent)
  end

  it 'lists recent messages when the query is blank' do
    expect(search(q: '')).to contain_exactly(from_contact, from_agent)
  end

  it 'only filters by inboxes the agent belongs to' do
    expect(search(q: 'refund', inbox_id: inbox.id)).to contain_exactly(from_contact, from_agent)
    expect(search(q: 'refund', inbox_id: other_inbox.id)).to contain_exactly(from_contact, from_agent)
  end
end
