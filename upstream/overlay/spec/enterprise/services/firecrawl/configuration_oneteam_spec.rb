require 'rails_helper'

# OneTeam coverage for the Firecrawl API key setting and the scrape options
# Captain sends with every crawl.
RSpec.describe Firecrawl::Configuration do
  it 'builds a client only once the API key is set' do
    expect(described_class.configured?).to be(false)
    expect { described_class.client }.to raise_error(Firecrawl::FirecrawlError, 'CAPTAIN_FIRECRAWL_API_KEY is not configured')

    create(:installation_config, name: 'CAPTAIN_FIRECRAWL_API_KEY', value: 'fc-key')

    expect(described_class.configured?).to be(true)
    expect(described_class.client).to be_a(Firecrawl::Client)
  end

  it 'scrapes the main content as Markdown, skipping navigation, and accepts a week-old cache' do
    options = described_class.default_scrape_options

    expect(options.to_h).to include('formats' => ['markdown'], 'onlyMainContent' => true,
                                    'excludeTags' => described_class::EXCLUDE_TAGS, 'maxAge' => 604_800_000)
    expect(described_class.default_scrape_options(max_age: 0).to_h).to include('maxAge' => 0)
  end
end
