require 'rails_helper'

# OneTeam coverage for TestData, the load-testing generator behind
# `rake data:generate_distributed_data`: it creates accounts full of contacts,
# conversations and messages, remembers their ids in tmp/ for clean-up, and
# tunes Postgres for bulk inserts while it runs. Sizes are shrunk to a few
# records here, and the spec runs in a temporary directory.
RSpec.describe TestData do
  around do |example|
    Dir.mktmpdir { |dir| Dir.chdir(dir) { example.run } }
  end

  before do
    stub_const('TestData::Constants::NUM_ACCOUNTS', 1)
    stub_const('TestData::Constants::MIN_MESSAGES', 60)
    stub_const('TestData::Constants::MAX_MESSAGES', 60)
    stub_const('TestData::Constants::BATCH_SIZE', 1)
    stub_const('TestData::Constants::MAX_CONVERSATIONS_PER_CONTACT', 1)
  end

  it 'generates accounts with conversations and messages, then cleans them up' do
    allow(Rails.logger).to receive(:info) { |*_args, &block| block&.call }
    described_class.generate

    account_ids = File.read(TestData::CleanupService::DATA_FILE).split(',').map(&:to_i)
    account = Account.find(account_ids.first)
    expect(account.inboxes.count).to eq(TestData::Constants::INBOXES_PER_ACCOUNT)
    expect(account.conversations).to exist
    expect(Message.where(account_id: account.id)).to exist

    described_class.cleanup

    expect(Account.where(id: account_ids)).not_to exist
    expect(File).not_to exist(TestData::CleanupService::DATA_FILE)
  end

  it 'skips clean-up when there is nothing to clean' do
    expect { described_class.cleanup }.not_to raise_error

    FileUtils.mkdir_p('tmp')
    File.write(TestData::CleanupService::DATA_FILE, ', ,')
    described_class.cleanup

    expect(File).not_to exist(TestData::CleanupService::DATA_FILE)
  end

  # Pins FINDINGS.md: conversations now reference a logged table, so Postgres
  # refuses to make them UNLOGGED and setup fails before generating anything.
  it 'cannot switch conversations to unlogged on the current schema' do
    expect { TestData::DatabaseOptimizer.setup }.to raise_error(ActiveRecord::StatementInvalid, /references logged table/)
  end

  it 'toggles triggers and restores normal settings' do
    connection = ActiveRecord::Base.connection
    allow(connection).to receive(:execute).and_call_original

    TestData::DatabaseOptimizer.send(:disable_triggers)
    TestData::DatabaseOptimizer.restore

    expect(connection).to have_received(:execute).with('ALTER TABLE messages DISABLE TRIGGER ALL')
    expect(connection).to have_received(:execute).with('ALTER TABLE messages ENABLE TRIGGER ALL')
    expect(connection).to have_received(:execute).with('RESET work_mem')
  end

  it 'adds optional contact details on some contacts only' do
    service = TestData::ContactBatchService.allocate
    allow(service).to receive(:rand).and_return(0.1)

    expect(service.send(:generate_e164_phone_number)).to start_with('+')
    expect(service.send(:maybe_add_additional_attributes)).to include(:company, :city, :country)
  end
end
