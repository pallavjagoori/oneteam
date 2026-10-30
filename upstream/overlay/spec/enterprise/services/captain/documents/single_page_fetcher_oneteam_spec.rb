require 'rails_helper'

# OneTeam coverage for fetching one web page as a Captain document. With a
# Firecrawl key the page is scraped through Firecrawl's API; otherwise
# Chatwoot's own crawler fetches it. Failures come back as error codes the
# UI translates.
RSpec.describe Captain::Documents::SinglePageFetcher do
  let(:url) { 'https://docs.example/refunds' }
  let(:fetcher) { described_class.new(url) }
  let(:scrape_url) { 'https://api.firecrawl.dev/v2/scrape' }

  context 'with Firecrawl' do
    before { create(:installation_config, name: 'CAPTAIN_FIRECRAWL_API_KEY', value: 'fc-key') }

    def scraped(data, status: 200)
      stub_request(:post, scrape_url).to_return(status: status, body: { data: data }.to_json,
                                                headers: { 'Content-Type' => 'application/json' })
    end

    it 'returns the page title and Markdown, trimmed to the column limits' do
      scraped({ metadata: { title: 'T' * 300, statusCode: 200 }, markdown: '# Refunds' })

      result = fetcher.fetch

      expect(result).to have_attributes(success: true, content: '# Refunds')
      expect(result.title.length).to eq(255)
      expect(a_request(:post, scrape_url).with(headers: { 'Authorization' => 'Bearer fc-key' },
                                               body: hash_including('url' => url, 'formats' => ['markdown']))).to have_been_made
    end

    it 'reads the scraped page’s own status, since Firecrawl itself answers 200' do
      scraped({ metadata: { statusCode: 404 }, markdown: 'Not found' })

      expect(fetcher.fetch).to have_attributes(success: false, error_code: 'not_found')
    end

    it 'treats a page with no content as empty' do
      scraped({ metadata: {}, markdown: '' })

      expect(fetcher.fetch).to have_attributes(success: false, error_code: 'content_empty')
    end

    {
      403 => 'access_denied', 401 => 'access_denied', 504 => 'timeout', 408 => 'timeout', 500 => 'fetch_failed'
    }.each do |status, code|
      it "maps a #{status} from Firecrawl to #{code}" do
        scraped(nil, status: status)

        expect(fetcher.fetch.error_code).to eq(code)
      end
    end

    it 'reports a timeout' do
      stub_request(:post, scrape_url).to_timeout

      expect(fetcher.fetch).to have_attributes(success: false, error_code: 'timeout')
    end

    it 'reports a connection failure' do
      stub_request(:post, scrape_url).to_raise(SocketError)

      expect(fetcher.fetch).to have_attributes(success: false, error_code: 'fetch_failed')
    end
  end

  context 'without Firecrawl' do
    let(:crawler) do
      instance_double(Captain::Tools::SimplePageCrawlService, success?: true, status_code: 200, page_title: 'Refunds',
                                                              body_markdown: 'Within 30 days.')
    end

    before { allow(Captain::Tools::SimplePageCrawlService).to receive(:new).with(url).and_return(crawler) }

    it 'uses Chatwoot’s own crawler' do
      expect(fetcher.fetch).to have_attributes(success: true, title: 'Refunds', content: 'Within 30 days.')
    end

    it 'maps the crawler’s HTTP status to an error code' do
      allow(crawler).to receive_messages(success?: false, status_code: 404)

      expect(fetcher.fetch).to have_attributes(success: false, error_code: 'not_found')
    end
  end
end
