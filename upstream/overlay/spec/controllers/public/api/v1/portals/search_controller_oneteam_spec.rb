require 'rails_helper'

# OneTeam coverage for the public help center search page
# (/hc/:slug/:locale/search). It searches published articles in the page's
# locale (an article's locale is its category's), ten per page, and shows nothing for an empty query. On enterprise,
# accounts with help_center_embedding_search use semantic (vector) search.
RSpec.describe 'Public portal search', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account) }
  let(:portal) { create(:portal, account: account, slug: 'help', custom_domain: 'www.example.com', config: { allowed_locales: %w[en es] }) }
  let(:category) { create(:category, portal: portal, account: account, locale: 'en', slug: 'billing') }
  let!(:refund_article) do
    create(:article, portal: portal, category: category, account: account, author: agent, locale: 'en', title: 'Refund policy',
                     content: 'How refunds work')
  end

  before do
    create(:article, portal: portal, category: category, account: account, author: agent, locale: 'en', title: 'Draft refund', status: :draft)
    spanish = create(:category, portal: portal, account: account, locale: 'es', slug: 'facturacion')
    create(:article, portal: portal, category: spanish, account: account, author: agent, title: 'Refund in Spanish')
    create(:article, portal: portal, category: category, account: account, author: agent, locale: 'en', title: 'Shipping times')
  end

  it 'lists published articles that match the query in the page locale' do
    get "/hc/#{portal.slug}/en/search", params: { query: ' refund ' }

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('Found 1 result', 'Refund policy')
    expect(response.body).not_to include('Draft refund', 'Refund in Spanish')
  end

  it 'shows no results for an empty query' do
    get "/hc/#{portal.slug}/en/search", params: { query: '  ' }

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('No results found for &#39;&#39;')
  end

  it 'renders the plain layout used inside the widget' do
    get "/hc/#{portal.slug}/en/search", params: { query: 'refund', show_plain_layout: 'true' }

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('Refund policy')
  end

  it 'renders the documentation layout' do
    portal.update!(config: portal.config.merge('layout' => 'documentation'))

    get "/hc/#{portal.slug}/en/search", params: { query: 'refund' }

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('Refund policy')
  end

  it 'uses semantic search when the account has it', if: ChatwootApp.enterprise? do
    account.enable_features!('help_center_embedding_search')
    allow(Article).to receive(:vector_search).and_return(Article.where(id: refund_article.id))

    get "/hc/#{portal.slug}/en/search", params: { query: 'money back' }

    expect(response.body).to include('Refund policy')
    expect(Article).to have_received(:vector_search).with(hash_including('query' => 'money back', :account_id => account.id, :limit => nil))
  end
end
