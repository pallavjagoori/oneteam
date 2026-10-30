require 'rails_helper'

# OneTeam coverage for building one starter help-center article during
# onboarding: Firecrawl batch-scrapes the article's source pages, the model
# rewrites them into one article, and it is saved as a draft. Firecrawl and
# the model are both faked over HTTP.
RSpec.describe Onboarding::HelpCenterArticleBuilder do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:portal) { create(:portal, account_id: account.id) }
  let(:category) { create(:category, portal: portal, account: account) }
  let(:urls) { ['https://acme.example/refunds', 'https://acme.example/returns'] }
  let(:builder) do
    described_class.new(account: account, portal: portal, user: user,
                        article: { 'urls' => urls, 'title' => title, 'category_id' => category.id })
  end
  let(:title) { 'Refunds' }
  let(:firecrawl) { 'https://api.firecrawl.dev/v2/batch/scrape' }

  before { create(:installation_config, name: 'CAPTAIN_FIRECRAWL_API_KEY', value: 'fc-key') }

  def scraped(*documents)
    stub_request(:post, firecrawl).to_return(status: 200, headers: { 'Content-Type' => 'application/json' },
                                             body: { success: true, id: 'batch1' }.to_json)
    stub_request(:get, "#{firecrawl}/batch1").to_return(status: 200, headers: { 'Content-Type' => 'application/json' },
                                                        body: { status: 'completed', total: documents.size, data: documents }.to_json)
  end

  def page(url, markdown, status: 200, title: 'Page')
    { markdown: markdown, metadata: { sourceURL: url, statusCode: status, title: " #{title} " } }
  end

  it 'scrapes the pages, rewrites them and saves a draft article citing its sources' do
    scraped(page(urls[0], 'Refunds take 5 days.'), page(urls[1], 'Return within 30 days.'))
    model_replies(json_reply(title: 'Refunds and returns', description: 'How it works', content: 'Return within 30 days.'))

    article = builder.perform

    expect(article).to have_attributes(title: 'Refunds and returns', description: 'How it works', status: 'draft',
                                       author_id: user.id, category_id: category.id)
    expect(article.meta['source_urls']).to eq(urls)
    expect(a_request(:post, firecrawl).with(body: hash_including('urls' => urls, 'formats' => ['markdown']))).to have_been_made
  end

  it 'skips pages that failed or came back empty' do
    scraped(page(urls[0], 'Refunds take 5 days.', status: 404), page(urls[1], ''),
            { markdown: 'Kept', metadata: { url: 'https://acme.example/kept' } })
    model_replies(json_reply(title: 'T', description: '', content: 'C'))

    article = builder.perform

    expect(article.meta['source_urls']).to eq(['https://acme.example/kept'])
    expect(article.description).to be_nil
  end

  context 'without a title from curation' do
    let(:title) { nil }

    it 'suggests the first page’s title to the writer' do
      scraped(page(urls[0], 'Refunds take 5 days.', title: 'Refund policy'))
      model_replies(json_reply(title: 'T', description: 'D', content: 'C'))

      builder.perform

      expect(model_requests.last['messages'].last['content']).to start_with('Suggested title (you may rewrite): Refund policy')
    end
  end

  {
    'no page could be used' => [[], nil, 'scrape produced no usable pages'],
    'the writer fails' => [[:page], :error, 'writer LLM error'],
    'the writer returns no content' => [[:page], { title: 'T', description: 'D', content: '' }, 'writer returned blank content'],
    'the writer returns no title' => [[:page], { title: '', description: 'D', content: 'C' }, 'writer returned blank title']
  }.each do |case_name, (pages, reply, message)|
    it "fails when #{case_name}" do
      scraped(*pages.map { page(urls[0], 'Text') })
      if reply == :error
        stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad' } }.to_json)
      elsif reply
        model_replies(json_reply(reply))
      end

      expect { builder.perform }.to raise_error(Onboarding::HelpCenterErrors::ArticleBuildFailed, /#{message}/)
      expect(portal.articles).to be_empty
    end
  end
end
