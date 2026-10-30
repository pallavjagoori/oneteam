require 'rails_helper'

# OneTeam coverage for moving several help center articles to another
# category at once (the articles and the category must belong to the
# portal), and for a bulk change that fails validation part way, which
# rolls back and returns the error.
RSpec.describe 'Article bulk category change', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:portal) { create(:portal, account: account) }
  let(:category) { create(:category, portal: portal, account: account, locale: 'en', slug: 'start') }
  let(:target) { create(:category, portal: portal, account: account, locale: 'en', slug: 'billing') }
  let!(:articles) { create_list(:article, 2, category: category, portal: portal, account: account, author: admin) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/portals/#{portal.slug}/articles/bulk_actions" }

  def move(ids, category_id)
    patch "#{base_url}/update_category", headers: admin.create_new_auth_token, params: { ids: ids, category_id: category_id }, as: :json
  end

  it 'moves the articles to the category' do
    move(articles.map(&:id), target.id)

    expect(response).to have_http_status(:ok)
    expect(articles.map { |article| article.reload.category_id }).to all(eq(target.id))
  end

  it 'rejects an empty selection or a category from another portal' do
    move([0], target.id)
    expect(response.parsed_body['error']).to eq(I18n.t('portals.articles.no_articles_found'))

    move(articles.map(&:id), create(:category, account: account).id)
    expect(response.parsed_body['error']).to eq(I18n.t('portals.articles.category_not_found'))
  end

  it 'rolls back and returns the error when an article is invalid' do
    allow_any_instance_of(Article).to receive(:update!).and_raise(ActiveRecord::RecordInvalid.new(Article.new)) # rubocop:disable RSpec/AnyInstance

    move(articles.map(&:id), target.id)
    expect(response).to have_http_status(:unprocessable_content)

    patch "#{base_url}/update_status", headers: admin.create_new_auth_token, params: { ids: articles.map(&:id), status: 'published' }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
  end
end
