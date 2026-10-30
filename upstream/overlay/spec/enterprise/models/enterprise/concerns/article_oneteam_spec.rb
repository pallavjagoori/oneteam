require 'rails_helper'

# OneTeam coverage for help center semantic search: articles are ranked by
# how close their search-term embeddings are to the query's, within the
# requested category, and each article's search terms are written by
# OpenAI's chat completions API. The HTTP request is the contract the port
# must send.
RSpec.describe Enterprise::Concerns::Article do
  let(:account) { create(:account) }
  let(:portal) { create(:portal, account: account) }
  let(:category) { create(:category, portal: portal, account: account, slug: 'billing', locale: 'en') }

  def unit_vector(*weights)
    Array.new(1536, 0.0).tap { |vector| weights.each_with_index { |weight, index| vector[index] = weight } }
  end

  def article_with_embedding(vector, category: self.category)
    create(:article, account: account, portal: portal, category: category).tap do |article|
      ArticleEmbedding.create!(article: article, term: article.title, embedding: vector)
    end
  end

  describe '.vector_search' do
    let!(:closest) { article_with_embedding(unit_vector(1.0)) }
    let!(:further) { article_with_embedding(unit_vector(0.5, 1.0)) }
    let!(:unrelated) { article_with_embedding(unit_vector(0.0, 0.0, 1.0)) }
    let(:other_category) { create(:category, portal: portal, account: account, slug: 'shipping', locale: 'en') }

    before do
      allow(Captain::Llm::EmbeddingService).to receive(:new).with(account_id: account.id)
                                                            .and_return(instance_double(Captain::Llm::EmbeddingService,
                                                                                        get_embedding: unit_vector(1.0)))
    end

    it 'returns the nearest articles first, five by default' do
      expect(Article.vector_search({ 'query' => 'refund', :account_id => account.id }).to_a).to eq([closest, further, unrelated])
    end

    it 'honours the limit and the category filter' do
      article_with_embedding(unit_vector(1.0), category: other_category)

      expect(Article.vector_search({ 'query' => 'refund', :account_id => account.id, :category_slug => 'billing', :limit => 2 }).to_a)
        .to eq([closest, further])
    end
  end

  describe '#add_article_embedding' do
    it 'queues indexing when embedding search is on and the text changes' do
      account.enable_features!('help_center_embedding_search')

      expect { create(:article, account: account, portal: portal, category: category) }
        .to have_enqueued_job(Portal::ArticleIndexingJob)
    end

    it 'does nothing when embedding search is off' do
      expect { create(:article, account: account, portal: portal, category: category) }
        .not_to have_enqueued_job(Portal::ArticleIndexingJob)
    end
  end

  describe '#generate_and_save_article_seach_terms' do
    let(:article) { create(:article, account: account, portal: portal, category: category, title: 'Refunds', description: 'How', content: 'Steps') }
    let(:reply) { { choices: [{ message: { content: { search_terms: ['refund policy', 'money back'] }.to_json } }] } }

    before { allow(Rails.logger).to receive(:info) }

    it 'replaces the article’s search terms with the ones OpenAI suggests' do
      create(:installation_config, name: 'CAPTAIN_OPEN_AI_API_KEY', value: 'sk-test')
      ArticleEmbedding.create!(article: article, term: 'old term')
      request = stub_request(:post, 'https://api.openai.com/v1/chat/completions')
                .with(headers: { 'Authorization' => 'Bearer sk-test' }) do |sent|
        body = JSON.parse(sent.body)
        body['model'] == 'gpt-6-luna' && body['response_format'] == { 'type' => 'json_object' } &&
          body['messages'].last['content'] == "title: Refunds \n description: How \n content: Steps"
      end
                .to_return(status: 200, body: reply.to_json, headers: { 'Content-Type' => 'application/json' })

      article.generate_and_save_article_seach_terms

      expect(request).to have_been_requested
      expect(article.article_embeddings.pluck(:term)).to contain_exactly('refund policy', 'money back')
    end

    it 'uses a custom OpenAI-compatible endpoint' do
      create(:installation_config, name: 'CAPTAIN_OPEN_AI_API_KEY', value: 'sk-test')
      create(:installation_config, name: 'CAPTAIN_OPEN_AI_ENDPOINT', value: 'https://llm.example.com/')
      request = stub_request(:post, 'https://llm.example.com/v1/chat/completions')
                .to_return(status: 200, body: reply.to_json, headers: { 'Content-Type' => 'application/json' })

      expect(article.generate_article_search_terms).to eq(['refund policy', 'money back'])
      expect(request).to have_been_requested
    end

    it 'fails without an API key' do
      expect { article.generate_article_search_terms }.to raise_error(RuntimeError, 'Captain AI API key is not configured.')
    end
  end
end
