require 'rails_helper'

# OneTeam coverage for Captain document sync bookkeeping (which documents are
# stale or freshly synced), the display link of a Markdown document stored
# without a file, and source links that cannot be shown to customers.
RSpec.describe Captain::Document do
  let(:assistant) { create(:captain_assistant) }

  before do
    allow(Captain::Documents::CrawlJob).to receive(:perform_later)
    allow(Captain::Documents::ResponseBuilderJob).to receive(:perform_later)
  end

  def document_with(status, synced_at)
    create(:captain_document, assistant: assistant, account: assistant.account).tap do |document|
      document.update_columns(sync_status: described_class.sync_statuses[status], last_synced_at: synced_at) # rubocop:disable Rails/SkipsModelValidations
    end
  end

  it 'finds stale and recently synced documents' do
    failed = document_with(:failed, nil)
    old = document_with(:synced, 10.days.ago)
    fresh = document_with(:synced, 1.hour.ago)

    expect(described_class.stale(1.day.ago)).to contain_exactly(failed, old)
    expect(described_class.synced_since(1.day.ago)).to contain_exactly(fresh)
  end

  it 'shows the stored link of a Markdown document without a file' do
    document = create(:captain_document, assistant: assistant, account: assistant.account, content: '# Notes')
    document.update_column(:external_link, 'MARKDOWN:notes') # rubocop:disable Rails/SkipsModelValidations

    expect(document.display_url).to eq('MARKDOWN:notes')
  end

  it 'hides source links that are malformed or do not resolve' do
    document = build(:captain_document, external_link: 'https://exa mple.com/page')
    expect(document.customer_visible_source_url).to be_nil

    document.external_link = 'https://docs.unresolvable.test/page'
    allow(SsrfFilter::DEFAULT_RESOLVER).to receive(:call).and_raise(Resolv::ResolvError)
    expect(document.customer_visible_source_url).to be_nil
  end
end
