require 'rails_helper'

# OneTeam coverage for how a document sync gives up: a sync already running
# is skipped, a permanent error (page gone, no content) is dropped at once,
# a site that stays unreachable is retried four times and then marked
# failed, and an unexpected error is retried three times and then reported.
RSpec.describe Captain::Documents::PerformSyncJob, type: :job do
  let!(:document) { create(:captain_document, status: :available) }
  let(:sync_service) { instance_double(Captain::Documents::SyncService) }
  let(:log_lines) { [] }

  before do
    allow(Captain::Documents::SyncService).to receive(:new).and_return(sync_service)
    allow(Rails.logger).to receive(:info) { |line| log_lines << line }
  end

  def results
    log_lines.grep(/\A\[Captain::Documents::PerformSyncJob\] {/).map { |line| JSON.parse(line.split('] ', 2).last)['result'] }
  end

  it 'skips a document whose sync is already running' do
    allow_any_instance_of(described_class).to receive(:with_lock).and_raise(MutexApplicationJob::LockAcquisitionError) # rubocop:disable RSpec/AnyInstance

    described_class.perform_now(document)

    expect(results).to eq(['already_syncing'])
  end

  it 'drops a permanent failure without retrying' do
    allow(sync_service).to receive(:perform).and_raise(Captain::Documents::SyncService::PermanentSyncError, 'not_found')

    perform_enqueued_jobs(only: described_class) { described_class.perform_later(document) }

    expect(sync_service).to have_received(:perform).once
    expect(results).to eq(['permanent_failure'])
  end

  it 'marks the document failed once an unreachable site has had four tries' do
    allow(sync_service).to receive(:perform).and_raise(Captain::Documents::SyncService::TransientSyncError, 'timeout')

    perform_enqueued_jobs(only: described_class) { described_class.perform_later(document) }

    expect(sync_service).to have_received(:perform).exactly(4).times
    expect(results).to eq((%w[transient_failure] * 4) + %w[transient_retry_exhausted])
    expect(document.reload).to have_attributes(sync_status: 'failed', last_sync_error_code: 'timeout')
  end

  it 'reports an unexpected error once, after three tries' do
    allow(sync_service).to receive(:perform).and_raise(NoMethodError, 'parser bug')
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)

    perform_enqueued_jobs(only: described_class) { described_class.perform_later(document) }

    expect(sync_service).to have_received(:perform).exactly(3).times
    expect(results).to eq((%w[unexpected_failure] * 3) + %w[unexpected_retry_exhausted])
    expect(tracker).to have_received(:capture_exception).once
  end
end
