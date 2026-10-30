require 'rails_helper'

# OneTeam coverage for the conversations resource of Copilot's get_data tool.
# It owns which conversations the agent may see, the filters the model may
# use, newest-first selection, database-side counts per group, and display
# rows. Shared behaviour from BaseResource is pinned here too.
RSpec.describe Captain::Copilot::Resources::Conversations do
  subject(:resource) { described_class.new(account: account, user: admin) }

  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:inbox) { create(:inbox, account: account, name: 'Email') }
  let(:as_of) { Time.current }
  let!(:open_one) { create(:conversation, account: account, inbox: inbox, last_activity_at: 3.days.ago) }
  let!(:resolved_one) { create(:conversation, account: account, inbox: inbox, status: :resolved, assignee: admin, last_activity_at: 1.day.ago) }

  def matching(filters = nil, source: nil, **keyword_filters)
    resource.matching(resource.normalize(filters || keyword_filters), as_of: as_of, source: source)
  end

  describe '.help' do
    it 'lists filters with their allowed values, groups and sources' do
      help = described_class.help

      expect(help).to start_with('- conversations: filters since, before, newest (The number of most recent records by date_field)')
      expect(help).to include('status (open or resolved or pending or snoozed)', 'priority (low or medium or high or urgent or null)')
      expect(help).to include('Group by: day, week, month, year, status, priority, inbox, assignee, team, label')
      expect(help).to end_with('Can start from: conversations, contacts, messages')
    end
  end

  describe '#normalize' do
    it 'defaults the date field to the first one' do
      expect(resource.normalize({ status: 'open' })).to eq('status' => 'open', 'date_field' => 'last_activity_at')
    end

    it 'rejects filters outside the schema' do
      expect { resource.normalize({ color: 'red' }) }.to raise_error(ArgumentError, /Invalid conversations filters. Allowed: since/)
    end
  end

  describe '#matching' do
    it 'filters by status, assignee and labels' do
      open_one.update!(label_list: ['billing'])

      expect(matching(status: 'resolved')).to contain_exactly(resolved_one)
      expect(matching(assignee_id: nil)).to contain_exactly(open_one)
      expect(matching(labels: ['billing'])).to contain_exactly(open_one)
    end

    it 'limits dates with since and before' do
      expect(matching(since: 2.days.ago.iso8601)).to contain_exactly(resolved_one)
      expect(matching(before: 2.days.ago.iso8601)).to contain_exactly(open_one)
    end

    it 'rejects an empty or future date range' do
      expect { matching(since: 1.day.ago.iso8601, before: 2.days.ago.iso8601) }.to raise_error(ArgumentError, 'since must be earlier than before')
      expect { matching(before: 1.day.from_now.iso8601) }.to raise_error(ArgumentError, 'before cannot be in the future')
    end

    it 'only shows an agent the conversations of their inboxes' do
      agent = create(:user, account: account, role: :agent)
      create(:inbox_member, user: agent, inbox: create(:inbox, account: account))
      visible = create(:conversation, account: account, inbox: agent.inboxes.first)

      agent_resource = described_class.new(account: account, user: agent)
      expect(agent_resource.matching(agent_resource.normalize({}), as_of: as_of)).to contain_exactly(visible)
    end

    it 'starts from the conversations of a saved set of contacts' do
      source = instance_double(CopilotRun::Collection, resource: 'contacts', record_ids: [open_one.contact_id])

      expect(matching({}, source: source)).to contain_exactly(open_one)
    end

    it 'starts from the conversations of saved messages' do
      message = create(:message, conversation: resolved_one, account: account)
      source = instance_double(CopilotRun::Collection, resource: 'messages', record_ids: [message.id])

      expect(matching({}, source: source)).to contain_exactly(resolved_one)
    end

    it 'rejects a source it cannot start from' do
      source = instance_double(CopilotRun::Collection, resource: 'articles')

      expect { matching({}, source: source) }.to raise_error(ArgumentError, /cannot start from articles. Possible sources: conversations/)
    end
  end

  describe '#selected_ids' do
    it 'returns newest first, or only the newest N' do
      filters = resource.normalize({})
      relation = resource.matching(filters, as_of: as_of)

      expect(resource.selected_ids(relation, filters)).to eq([resolved_one.id, open_one.id])
      expect(resource.selected_ids(relation, filters.merge('newest' => 1))).to eq([resolved_one.id])
    end
  end

  describe '#group_counts' do
    let(:filters) { resource.normalize({}) }
    let(:relation) { resource.matching(filters, as_of: as_of) }

    it 'counts by status, largest first' do
      create(:conversation, account: account, inbox: inbox)

      expect(resource.group_counts(relation.reload, filters, as_of, 'status')).to eq([{ group: 'open', count: 2 }, { group: 'resolved', count: 1 }])
    end

    it 'names inboxes and assignees, and counts missing ones as None' do
      expect(resource.group_counts(relation, filters, as_of, 'inbox')).to eq([{ group: "Email (ID #{inbox.id})", count: 2 }])
      expect(resource.group_counts(relation, filters, as_of, 'assignee'))
        .to contain_exactly({ group: 'None', count: 1 }, { group: "#{admin.name} (ID #{admin.id})", count: 1 })
      expect(resource.group_counts(relation, filters, as_of, 'team')).to eq([{ group: 'None', count: 2 }])
      expect(resource.group_counts(relation, filters, as_of, 'priority')).to eq([{ group: 'None', count: 2 }])
    end

    it 'counts each label, and unlabeled conversations as No label' do
      open_one.update!(label_list: %w[billing vip])

      expect(resource.group_counts(relation, filters, as_of, 'label'))
        .to contain_exactly({ group: 'billing', count: 1 }, { group: 'vip', count: 1 }, { group: 'No label', count: 1 })
    end

    it 'counts per UTC day, including empty days in the range' do
      ranged = resource.normalize({ since: 4.days.ago.beginning_of_day.iso8601 })
      groups = resource.group_counts(resource.matching(ranged, as_of: as_of), ranged, as_of, 'day')

      expect(groups.size).to eq(5)
      expect(groups.sum { |group| group[:count] }).to eq(2)
      expect(groups.first[:group]).to eq(4.days.ago.utc.to_date.iso8601)
    end

    it 'names weeks, months and years' do
      expect(resource.group_counts(relation, filters, as_of, 'week').first[:group]).to start_with('week of ')
      expect(resource.group_counts(relation, filters, as_of, 'month').sum { |group| group[:count] }).to eq(2)
      expect(resource.group_counts(relation, filters, as_of, 'year').first[:group]).to match(/\A\d{4}\z/)
    end

    it 'rejects an unknown group or too many groups' do
      expect { resource.group_counts(relation, filters, as_of, 'color') }.to raise_error(ArgumentError, /group_by must be one of: day, week/)

      stub_const('Captain::Copilot::Resources::BaseResource::MAX_GROUPS', 1)
      expect { resource.group_counts(relation, filters, as_of, 'status') }.to raise_error(ArgumentError, /gives 2 groups/)
    end
  end

  describe '#rows' do
    it 'returns display rows in the given order, skipping records the user cannot see' do
      resolved_one.update!(label_list: ['billing'])
      hidden = create(:conversation)

      rows = resource.rows([resolved_one.id, hidden.id, open_one.id])

      expect(rows.first).to eq(label: "##{resolved_one.display_id}", url: "/app/accounts/#{account.id}/conversations/#{resolved_one.display_id}",
                               values: ['resolved', 'billing', resolved_one.last_activity_at.to_date])
      expect(rows.size).to eq(2)
    end
  end

  it 'sees nothing for a user outside the account' do
    outsider = described_class.new(account: account, user: create(:user))

    expect(outsider.scope).to be_empty
  end
end
