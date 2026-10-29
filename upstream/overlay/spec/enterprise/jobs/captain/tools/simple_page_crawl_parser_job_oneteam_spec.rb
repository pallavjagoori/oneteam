require 'rails_helper'

# OneTeam coverage for crawling one page into a Captain document: nothing
# is fetched once the plan's document limit is used up, a page that needs a
# login is a permanent failure (the job is dropped), and a timeout raises so
# the job is retried.
RSpec.describe Captain::Tools::SimplePageCrawlParserJob, type: :job do
  let(:assistant) { create(:captain_assistant) }
  let(:page_link) { 'https://example.com/private' }
  let(:crawler) { instance_double(Captain::Tools::SimplePageCrawlService, success?: false) }
  let!(:document) { create(:captain_document, assistant: assistant, account: assistant.account, external_link: page_link) }

  before { allow(Captain::Tools::SimplePageCrawlService).to receive(:new).with(page_link).and_return(crawler) }

  it 'does nothing once the document limit is used up' do
    allow(Captain::Assistant).to receive(:find).with(assistant.id).and_return(assistant)
    allow(assistant.account).to receive(:usage_limits).and_return({ captain: { documents: { current_available: 0 } } })
    allow(Rails.logger).to receive(:info)

    described_class.perform_now(assistant_id: assistant.id, page_link: page_link)

    expect(Captain::Tools::SimplePageCrawlService).not_to have_received(:new)
    expect(Rails.logger).to have_received(:info).with("Document limit exceeded for #{assistant.id}")
  end

  it 'drops the job for a page that needs a login' do
    allow(crawler).to receive(:status_code).and_return(403)

    expect { described_class.perform_now(assistant_id: assistant.id, page_link: page_link) }.not_to raise_error
    expect(document.reload).to have_attributes(sync_status: 'failed', last_sync_error_code: 'access_denied')
  end

  it 'raises on a timeout so the job is retried' do
    allow(crawler).to receive(:status_code).and_return(504)

    expect { described_class.perform_now(assistant_id: assistant.id, page_link: page_link) }
      .to raise_error("Failed to parse data: #{page_link} Failed to fetch page: #{page_link}")
    expect(document.reload.last_sync_error_code).to eq('timeout')
  end
end
