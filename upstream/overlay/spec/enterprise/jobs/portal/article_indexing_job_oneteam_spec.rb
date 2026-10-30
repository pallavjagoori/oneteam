require 'rails_helper'

# OneTeam coverage: the job regenerates an article's search terms.
RSpec.describe Portal::ArticleIndexingJob do
  it 'regenerates the article search terms' do
    article = instance_double(Article, generate_and_save_article_seach_terms: true)

    described_class.perform_now(article)

    expect(article).to have_received(:generate_and_save_article_seach_terms)
  end

  it 'runs on the low queue' do
    expect(described_class.new.queue_name).to eq('low')
  end
end
