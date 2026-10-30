require 'rails_helper'

# OneTeam coverage for the parts of the Freshdesk import source that the
# shared importer asks every source for: its default name, contact lookup,
# error classification and the codes and reasons it records for skipped or
# already-imported records.
RSpec.describe DataImports::Freshdesk::Source do
  let(:source) { described_class.new(access_token: 'key', source_metadata: { 'domain' => 'acme.freshdesk.com' }) }
  let(:client) { instance_double(DataImports::Freshdesk::Client) }

  before { source.instance_variable_set(:@client, client) }

  it 'names new imports' do
    expect(described_class.default_import_name).to eq('Freshdesk import')
  end

  it 'fetches and normalises a contact' do
    allow(client).to receive(:retrieve_contact).with(7).and_return({ 'id' => 7, 'name' => 'Ada', 'email' => 'ada@example.com' })

    expect(source.retrieve_contact(7)).to include('id' => '7', 'name' => 'Ada')
  end

  it 'recognises Freshdesk client errors' do
    expect(source.client_error?(DataImports::Freshdesk::Client::Error.new('rate limited'))).to be(true)
    expect(source.client_error?(StandardError.new)).to be(false)
  end

  it 'has no activity parts and fixed skip codes' do
    expect(source.activity_content({})).to be_nil
    expect(source.already_imported_error_code).to eq(described_class::ALREADY_IMPORTED_ERROR_CODE)
    expect(source.skipped_message_error_code).to eq(described_class::SKIPPED_MESSAGE_ERROR_CODE)
    expect(source.truncated_parts_error_code).to eq(described_class::TRUNCATED_PARTS_ERROR_CODE)
    expect(source.skipped_message_reason).to eq('blank_freshdesk_conversation')
  end
end
