require 'rails_helper'

# OneTeam coverage for re-syncing a web page document: an unchanged page only
# updates the sync times, and a failed fetch is permanent (the page is gone or
# blocked, so the document is marked failed) or transient (retried later).
RSpec.describe Captain::Documents::SyncService do
  let(:document) do
    create(:captain_document, external_link: 'https://docs.example/refunds', content: 'Old', name: 'Refunds',
                              content_fingerprint: Digest::SHA256.hexdigest('Within 30 days.'))
  end
  let(:fetcher) { instance_double(Captain::Documents::SinglePageFetcher) }

  before { allow(Captain::Documents::SinglePageFetcher).to receive(:new).with(document.external_link).and_return(fetcher) }

  def fetched(**attributes)
    allow(fetcher).to receive(:fetch).and_return(Captain::Documents::SinglePageFetcher::Result.new(**attributes))
  end

  it 'only records the sync when the page is unchanged apart from whitespace' do
    fetched(success: true, title: 'New title', content: "  Within\n30   days. ")

    expect(described_class.new(document).perform).to eq(:unchanged)
    expect(document.reload).to have_attributes(content: 'Old', name: 'Refunds', sync_status: 'synced', sync_step: nil)
    expect(document.last_synced_at).to be_present
  end

  %w[not_found access_denied content_empty].each do |code|
    it "marks the document failed for a permanent #{code} error" do
      fetched(success: false, error_code: code)

      expect { described_class.new(document).perform }.to raise_error(described_class::PermanentSyncError, code)
      expect(document.reload).to have_attributes(sync_status: 'failed', last_sync_error_code: code, sync_step: nil)
    end
  end

  it 'raises a transient error for a timeout, leaving the document to be retried' do
    fetched(success: false, error_code: 'timeout')

    expect { described_class.new(document).perform }.to raise_error(described_class::TransientSyncError, 'timeout')
    expect(document.reload.sync_step).to eq('fetching')
  end
end
