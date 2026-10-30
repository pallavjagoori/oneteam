require 'rails_helper'

# OneTeam coverage for the errors the IMAP polling job swallows so one broken
# mailbox never stops the schedule: login failures, connection errors, a
# fetch that is already running, and anything unexpected.
RSpec.describe Inboxes::FetchImapEmailsJob do
  let(:channel) { create(:channel_email, imap_enabled: true) }
  let(:fetcher) { instance_double(Imap::FetchEmailService) }

  before do
    allow(Imap::FetchEmailService).to receive(:new).and_return(fetcher)
    allow(Rails.logger).to receive(:error)
  end

  it 'logs login failures' do
    allow(fetcher).to receive(:perform).and_raise(Net::IMAP::NoResponseError.new(Struct.new(:data).new(Struct.new(:text).new('bad login'))))

    described_class.perform_now(channel)

    expect(Rails.logger).to have_received(:error).with(/Error for email channel - #{channel.inbox.id}/)
  end

  it 'logs authorization errors' do
    allow(fetcher).to receive(:perform).and_raise(Errno::ECONNREFUSED)

    described_class.perform_now(channel)

    expect(Rails.logger).to have_received(:error).with(/Authorization error for email channel - #{channel.inbox.id}/)
  end

  it 'logs when another fetch holds the lock' do
    job = described_class.new
    allow(job).to receive(:with_lock).and_raise(MutexApplicationJob::LockAcquisitionError)

    job.perform(channel)

    expect(Rails.logger).to have_received(:error).with("Lock failed for #{channel.inbox.id}")
  end

  it 'reports unexpected errors' do
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    allow(fetcher).to receive(:perform).and_raise(ArgumentError, 'boom')

    described_class.perform_now(channel)

    expect(tracker).to have_received(:capture_exception)
  end

  it 'uses the Google fetcher for Google mailboxes' do
    channel.update!(provider: 'google')
    google_fetcher = instance_double(Imap::GoogleFetchEmailService, perform: [])
    allow(Imap::GoogleFetchEmailService).to receive(:new).and_return(google_fetcher)

    described_class.perform_now(channel)

    expect(google_fetcher).to have_received(:perform)
  end
end
