require 'rails_helper'

# OneTeam coverage: a page that can't be fetched for a reason other than an
# HTTP status (here, an address SafeFetch refuses) has no status and an empty
# body, and a favicon link that isn't a valid URL is returned as written.
RSpec.describe Captain::Tools::SimplePageCrawlService do
  it 'has no status when the page cannot be fetched' do
    allow(SafeFetch).to receive(:fetch).and_raise(SafeFetch::UnsafeUrlError, 'private address')

    service = described_class.new('http://10.0.0.1/docs')

    expect(service.status_code).to be_nil
    expect(service.success?).to be(false)
    expect(service.body_markdown).to eq('')
  end

  it 'returns a favicon link it cannot resolve as written' do
    page = Tempfile.new('page').tap do |file|
      file.write('<html><head><link rel="icon" href="%zz icon"></head></html>')
      file.rewind
    end
    allow(SafeFetch).to receive(:fetch).and_yield(SafeFetch::Result.new(tempfile: page, filename: 'page.html', content_type: 'text/html'))

    expect(described_class.new('https://example.com/docs').favicon_url).to eq('%zz icon')
  end
end
