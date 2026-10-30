require 'rails_helper'

# OneTeam coverage for how an Intercom import run moves through its stages:
# following page cursors, reusing a conversation imported before, marking the
# import failed when a stage raises, and the stage questions the page jobs ask.
RSpec.describe DataImports::Intercom::Importer do
  let(:account) { create(:account) }
  let(:data_import) { create(:data_import, :intercom, account: account) }
  let(:client) { instance_double(DataImports::Intercom::Client) }
  let(:importer) { described_class.new(data_import: data_import) }
  let(:contact) { { 'id' => 'contact_1', 'email' => 'one@example.com', 'name' => 'One', 'created_at' => 1_700_000_000 } }
  let(:conversation) do
    { 'id' => 'conversation_1', 'created_at' => 1_700_000_000, 'updated_at' => 1_700_000_200, 'state' => 'closed',
      'contacts' => { 'contacts' => [{ 'id' => 'contact_1' }] },
      'source' => { 'id' => 'source_1', 'type' => 'email', 'body' => '<p>Hello</p>', 'author' => { 'type' => 'user', 'id' => 'contact_1' } },
      'conversation_parts' => { 'conversation_parts' => [] } }
  end

  before do
    account.enable_features!('data_import')
    allow(DataImports::Intercom::Client).to receive(:new).and_return(client)
    allow(client).to receive(:list_contacts).with(starting_after: nil, per_page: 50)
                                            .and_return('data' => [contact], 'total_count' => 2,
                                                        'pages' => { 'next' => { 'starting_after' => 'c2' } })
    allow(client).to receive(:list_contacts).with(starting_after: 'c2', per_page: 50)
                                            .and_return('data' => [contact.merge('id' => 'contact_2', 'email' => 'two@example.com')],
                                                        'total_count' => 2, 'pages' => { 'next' => nil })
    allow(client).to receive(:list_conversations).with(starting_after: nil, per_page: 10)
                                                 .and_return('conversations' => [{ 'id' => 'conversation_1' }], 'total_count' => 2,
                                                             'pages' => { 'next' => { 'starting_after' => 'v2' } })
    allow(client).to receive(:list_conversations).with(starting_after: 'v2', per_page: 10)
                                                 .and_return('conversations' => [], 'total_count' => 2, 'pages' => { 'next' => nil })
    allow(client).to receive_messages(retrieve_conversation: conversation, retrieve_contact: contact)
  end

  it 'follows the next-page cursors for contacts and conversations' do
    importer.perform

    expect(account.contacts.pluck(:email)).to contain_exactly('one@example.com', 'two@example.com')
    expect(client).to have_received(:list_conversations).with(starting_after: 'v2', per_page: 10)
    expect(data_import.reload).to be_completed
  end

  it 'reuses a conversation that already has the Intercom identifier' do
    existing = create(:conversation, account: account, identifier: 'intercom:conversation_1')

    importer.perform

    expect(account.conversations.where(identifier: 'intercom:conversation_1')).to contain_exactly(existing)
  end

  it 'marks the import failed and re-raises when a stage fails' do
    allow(client).to receive(:list_contacts).and_raise(DataImports::Intercom::Client::Error, 'boom')

    expect { importer.perform }.to raise_error(DataImports::Intercom::Client::Error)
    expect(data_import.reload).to be_failed
  end

  it 'answers which stages are requested and finished' do
    expect(importer.import_contacts?).to be(true)
    expect(importer.import_conversations?).to be(true)
    expect(importer.contacts_completed?).to be(false)

    importer.perform

    expect(described_class.new(data_import: data_import.reload).conversations_completed?).to be(true)
  end
end
