require 'rails_helper'

# Unit coverage for the importer's race, stop and validation branches, which
# the end-to-end importer spec cannot reach deterministically.
RSpec.describe DataImports::Importer do
  let(:account) { create(:account) }
  let(:data_import) { create(:data_import, :intercom, account: account) }
  let(:importer) { DataImports::Intercom::Importer.new(data_import: data_import) }
  let(:conversation) { create(:conversation, account: account) }
  let(:entry_struct) { Struct.new(:source_id, :part, :mapping, :message, :classification, keyword_init: true) }
  let(:entry) { entry_struct.new(source_id: 'part_1', part: { 'id' => 'part_1' }) }
  let(:batch_builder) { instance_double(DataImports::MessageBatchBuilder) }

  before do
    allow(DataImports::Intercom::Client).to receive(:new).and_return(instance_double(DataImports::Intercom::Client))
    allow(importer).to receive(:fail_message)
  end

  it 'falls back to the existing contact when a concurrent insert wins' do
    allow(Contact).to receive(:insert_all!).and_raise(ActiveRecord::RecordNotUnique)
    existing = create(:contact, account: account)
    allow(importer).to receive(:find_existing_contact).and_return(existing)

    expect(importer.send(:create_contact, { 'id' => 'c1', 'email' => 'a@example.com' })).to eq(existing)
  end

  it 'maps the existing conversation when a concurrent insert wins' do
    inbox = create(:inbox, account: account)
    contact = create(:contact, account: account)
    contact_inbox = create(:contact_inbox, contact: contact, inbox: inbox)
    payload = { 'id' => 'conv_1', 'created_at' => 1.day.ago.to_i, 'updated_at' => 1.day.ago.to_i }
    winner = create(:conversation, account: account, inbox: inbox, contact: contact, identifier: 'race-1')
    allow(importer).to receive(:conversation_metadata).and_return({})
    allow(importer).to receive(:record_mapping)
    # The first lookup misses, as it would before the competing insert commits.
    allow(importer).to receive(:conversation_identifier).and_return('not-yet', 'race-1')
    allow(Conversation).to receive(:insert_all!).and_raise(ActiveRecord::RecordNotUnique)

    expect(importer.send(:create_conversation, payload, contact, contact_inbox, inbox, 'email')).to eq(winner)
    expect(importer).to have_received(:record_mapping).with('conversation', 'conv_1', winner, metadata: {})
  end

  describe 'stopped runs' do
    before { allow(importer).to receive(:inactive_import_run?).and_return(true) }

    it 'stops a fallback message write' do
      importer.send(:fallback_message_entry, conversation, nil, batch_builder, entry)

      expect(importer.instance_variable_get(:@import_stopped)).to be(true)
    end

    it 'stops a bulk message write' do
      importer.send(:bulk_write_message_entries, conversation, nil, batch_builder, [entry])

      expect(importer.instance_variable_get(:@import_stopped)).to be(true)
    end

    it 'stops an unprepared message write' do
      importer.send(:import_unprepared_message, conversation, nil, batch_builder, { source_id: 'part_1', part: {} })

      expect(importer.instance_variable_get(:@import_stopped)).to be(true)
    end
  end

  it 'records a failed fallback message write' do
    allow(batch_builder).to receive(:refresh).and_raise(ActiveRecord::RecordNotFound)

    importer.send(:fallback_message_entry, conversation, nil, batch_builder, entry)

    expect(importer).to have_received(:fail_message).with(conversation, 'part_1', entry.part, kind_of(ActiveRecord::RecordNotFound))
  end

  it 'records a failed unprepared message write' do
    allow(batch_builder).to receive(:perform).and_raise(StandardError, 'boom')

    importer.send(:import_unprepared_message, conversation, nil, batch_builder, { source_id: 'part_1', part: { 'id' => 'p' } })

    expect(importer).to have_received(:fail_message).with(conversation, 'part_1', { 'id' => 'p' }, kind_of(StandardError))
  end

  it 'reports a complete individual import when no parts remain' do
    allow(batch_builder).to receive(:unprepared_entries).and_return([])
    allow(importer).to receive(:record_truncated_conversation_parts)
    allow(importer).to receive(:import_stopped?).and_return(false)

    expect(importer.send(:import_conversation_messages_individually, {}, conversation, nil, batch_builder, 0)).to be(true)
  end

  it 'fails a message with an unknown classification' do
    unknown = entry_struct.new(source_id: 'part_1', part: {}, classification: :mystery)

    importer.send(:import_message, conversation, nil, unknown)

    expect(importer).to have_received(:fail_message).with(conversation, 'part_1', {}, kind_of(ArgumentError))
  end

  describe 'message payload validation' do
    it 'rejects an author that is not an object' do
      expect { importer.send(:validate_message_payload!, { 'author' => 'bob' }) }
        .to raise_error(described_class::InvalidMessagePayloadError, /author must be an object/)
    end

    it 'rejects a participant that is not an object' do
      expect { importer.send(:validate_message_payload!, { 'event_details' => { 'participant' => 'bob' } }) }
        .to raise_error(described_class::InvalidMessagePayloadError, /participant must be an object/)
    end

    it 'rejects a body with invalid encoding' do
      expect { importer.send(:validate_message_payload!, { 'body' => "\xFF".dup.force_encoding('UTF-8') }) }
        .to raise_error(described_class::InvalidMessagePayloadError, /body must use valid encoding/)
    end
  end

  describe 'skipped messages' do
    before do
      allow(importer).to receive(:record_skipped_message_log)
      allow(importer).to receive(:increment_stat)
    end

    it 'returns the mapped message and counts the skip once' do
      message = create(:message, conversation: conversation, account: account)
      mapped = entry_struct.new(source_id: 'part_1', part: {}, mapping: instance_double(DataImportMapping), message: message)
      allow(importer).to receive(:skip_log_recorded?).and_return(false)

      expect(importer.send(:record_skipped_message, conversation, mapped)).to eq(message)
      expect(importer).to have_received(:increment_stat).with('messages', 'skipped')
    end

    it 'records a skipped mapping for a new message' do
      expect { importer.send(:record_skipped_message, conversation, entry) }.to change(DataImportMapping, :count).by(1)
      expect(DataImportMapping.last.metadata).to include('skipped' => true)
    end
  end

  it 'reuses an import item created concurrently' do
    item = instance_double(DataImportItem)
    items = instance_double(ActiveRecord::Associations::CollectionProxy)
    allow(data_import).to receive(:items).and_return(items)
    allow(items).to receive(:find_by).and_return(nil, item)
    allow(items).to receive(:create!).and_raise(ActiveRecord::RecordNotUnique)

    expect(importer.send(:find_or_create_import_item, 'contact', 'c1')).to eq(item)
  end

  it 'rejects an unknown dirty stat group' do
    importer.instance_variable_set(:@dirty_stat_groups, { 'mystery' => true })

    expect { importer.send(:reconcile_dirty_stats) }.to raise_error(ArgumentError, /import stat group: mystery/)
  end
end
