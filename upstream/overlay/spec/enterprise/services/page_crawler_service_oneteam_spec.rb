require 'rails_helper'

# OneTeam coverage for the crawler that feeds Captain documents: it fetches
# one page and reads its title, its body as Markdown, and its links (from a
# sitemap's <loc> entries, or from an HTML page's anchors made absolute).
RSpec.describe PageCrawlerService do
  let(:html) do
    <<~HTML
      <html><head><title>  Help centre  </title></head>
      <body><h1>Billing</h1><p>Pay <b>monthly</b>.</p><custom>Kept</custom>
      <a href="/docs/a">A</a><a href="https://other.example/b">B</a><a href="/docs/a">A again</a></body></html>
    HTML
  end

  before do
    stub_request(:get, 'https://www.example.com/help/index.html').to_return(body: html)
    stub_request(:get, 'https://www.example.com/sitemap.xml').to_return(body: <<~XML)
      <?xml version="1.0"?><urlset><url><loc>https://www.example.com/one</loc></url><url><loc>https://www.example.com/two</loc></url></urlset>
    XML
  end

  it 'lists an HTML page’s links as absolute URLs, without duplicates' do
    links = described_class.new('https://www.example.com/help/index.html').page_links

    expect(links).to eq(Set['https://www.example.com/docs/a', 'https://other.example/b'])
  end

  it 'lists the URLs in a sitemap' do
    expect(described_class.new('https://www.example.com/sitemap.xml').page_links)
      .to eq(Set['https://www.example.com/one', 'https://www.example.com/two'])
  end

  it 'reads the trimmed title and the body as Markdown, keeping unknown tags’ text' do
    page = described_class.new('https://www.example.com/help/index.html')

    expect(page.page_title).to eq('Help centre')
    expect(page.body_text_content).to include('# Billing', 'Pay **monthly**.', 'Kept')
  end

  it 'has no title when the page has none' do
    expect(described_class.new('https://www.example.com/sitemap.xml').page_title).to be_nil
  end
end
