require 'rails_helper'

# OneTeam coverage for the contacts resource of Copilot's get_data tool. It
# needs the contact_manage permission for custom roles, lists the same
# contacts as the contacts page unless it starts from a saved set, and can
# search, filter and count contacts.
RSpec.describe Captain::Copilot::Resources::Contacts do
  subject(:resource) { described_class.new(account: account, user: admin) }

  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:company) { create(:company, account: account, name: 'Acme') }
  let(:as_of) { Time.current }
  let!(:jane) { create(:contact, account: account, name: 'Jane Doe', email: 'jane@acme.com', company: company) }
  let!(:blocked) { create(:contact, account: account, name: 'Spammer', phone_number: '+15550001111', blocked: true) }
  let!(:visitor) { create(:contact, account: account, name: nil, email: nil, phone_number: nil) }

  # Contact syncs country_code from additional_attributes on save, so set the stored values directly.
  before do
    jane.update_column(:country_code, 'IN') # rubocop:disable Rails/SkipsModelValidations
    blocked.update_column(:country_code, '') # rubocop:disable Rails/SkipsModelValidations
  end

  def matching(filters = nil, source: nil, **keyword_filters)
    resource.matching(resource.normalize(filters || keyword_filters), as_of: as_of, source: source)
  end

  it 'leaves out anonymous visitors, as the contacts page does' do
    expect(matching({})).to contain_exactly(jane, blocked)
  end

  it 'lists leads only with CRM v2' do
    account.enable_features!('crm_v2')
    blocked.update_column(:contact_type, Contact.contact_types[:customer]) # rubocop:disable Rails/SkipsModelValidations

    expect(matching({})).to contain_exactly(jane)
  end

  it 'keeps anonymous visitors reached from saved conversations' do
    conversation = create(:conversation, account: account, contact: visitor)
    source = instance_double(CopilotRun::Collection, resource: 'conversations', record_ids: [conversation.id])

    expect(matching({}, source: source)).to contain_exactly(visitor)
  end

  it 'starts from the senders of saved messages' do
    message = create(:message, account: account, conversation: create(:conversation, account: account, contact: jane))
    source = instance_double(CopilotRun::Collection, resource: 'messages', record_ids: [message.id])

    expect(matching({}, source: source)).to contain_exactly(jane)
  end

  it 'searches name, email and phone number, and filters by company, country, blocked and labels' do
    jane.update!(label_list: ['vip'])
    jane.update_column(:country_code, 'IN') # rubocop:disable Rails/SkipsModelValidations

    expect(matching(search: 'acme.c')).to contain_exactly(jane)
    expect(matching(search: '0001111')).to contain_exactly(blocked)
    expect(matching(company_id: company.id)).to contain_exactly(jane)
    expect(matching(country_code: 'IN')).to contain_exactly(jane)
    expect(matching(blocked: true)).to contain_exactly(blocked)
    expect(matching(labels: ['vip'])).to contain_exactly(jane)
  end

  it 'counts by country, treating an empty country as None, and by blocked and label' do
    filters = resource.normalize({})
    relation = resource.matching(filters, as_of: as_of)

    expect(resource.group_counts(relation, filters, as_of, 'country')).to contain_exactly({ group: 'IN', count: 1 }, { group: 'None', count: 1 })
    expect(resource.group_counts(relation, filters, as_of, 'blocked')).to contain_exactly({ group: 'true', count: 1 }, { group: 'false', count: 1 })
    expect(resource.group_counts(relation, filters, as_of, 'label')).to eq([{ group: 'No label', count: 2 }])
  end

  it 'counts contacts that were never active as No date' do
    filters = resource.normalize({})
    jane.update_column(:last_activity_at, 2.days.ago) # rubocop:disable Rails/SkipsModelValidations
    blocked.update_column(:last_activity_at, nil) # rubocop:disable Rails/SkipsModelValidations

    groups = resource.group_counts(resource.matching(filters, as_of: as_of), filters, as_of, 'day')

    expect(groups).to eq([{ group: 2.days.ago.utc.to_date.iso8601, count: 1 }, { group: 'No date', count: 1 }])
  end

  it 'shows email, phone, company and labels, and names unnamed contacts by id' do
    jane.update!(label_list: ['vip'])

    rows = resource.rows([jane.id, visitor.id])

    expect(rows.first).to eq(label: 'Jane Doe', url: "/app/accounts/#{account.id}/contacts/#{jane.id}", values: ['jane@acme.com', nil, 'Acme', 'vip'])
    expect(rows.last[:label]).to eq("Contact ##{visitor.id}")
  end

  context 'with a custom role' do
    let(:agent) { create(:user, account: account, role: :agent) }

    def with_permissions(permissions)
      role = create(:custom_role, account: account, permissions: permissions)
      AccountUser.find_by(account: account, user: agent).update!(custom_role: role)
      described_class.new(account: account, user: agent)
    end

    it 'needs contact_manage' do
      expect { with_permissions(['conversation_manage']).scope }.to raise_error(ArgumentError, 'You do not have permission to view contacts')
      expect(with_permissions(['contact_manage']).scope).to include(jane)
    end
  end

  it 'needs the user to belong to the account' do
    expect { described_class.new(account: account, user: create(:user)).scope }.to raise_error(ArgumentError, /permission to view contacts/)
  end
end
