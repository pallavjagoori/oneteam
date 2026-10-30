require 'rails_helper'

# OneTeam coverage for help center portal settings Chatwoot's spec leaves
# out: per-locale names and popular content in the config, linking the
# live chat widget (only website inboxes count), analytics ids that must
# be known keys with string values, invalid saves, and the archive
# endpoint, which fails (see FINDINGS.md).
RSpec.describe 'Portal settings', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }
  let!(:portal) { create(:portal, account: account, slug: 'help') }
  let(:url) { "/api/v1/accounts/#{account.id}/portals/help" }

  def update(params)
    patch url, params: params, headers: headers, as: :json
  end

  it 'saves per-locale names and popular content' do
    update(portal: { config: { allowed_locales: %w[en fr],
                               locale_translations: { fr: { name: 'Aide' } },
                               popular_content: { fr: { article_ids: [1] } } } })

    expect(response).to have_http_status(:ok)
    expect(portal.reload.config).to include('locale_translations' => { 'fr' => { 'name' => 'Aide' } },
                                            'popular_content' => { 'fr' => { 'article_ids' => [1] } })
  end

  it 'links the live chat widget of a website inbox only' do
    widget_inbox = create(:inbox, account: account)
    update(portal: { name: 'Help' }, inbox_id: widget_inbox.id)
    expect(portal.reload.channel_web_widget_id).to eq(widget_inbox.channel.id)

    update(portal: { name: 'Help' }, inbox_id: create(:channel_api, account: account).inbox.id)
    expect(portal.reload.channel_web_widget_id).to eq(widget_inbox.channel.id)
  end

  it 'rejects unknown analytics settings' do
    update(portal: { config: { analytics: { facebook_pixel: '123' } } })

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to eq(I18n.t('portals.analytics.invalid_configuration'))
  end

  it 'returns validation errors' do
    update(portal: { color: 'blue' })

    expect(response).to have_http_status(:unprocessable_content)
  end

  # The action sets `archive`, but the column is `archived`, so Rails raises
  # an unknown attribute error and the request fails.
  it 'fails to archive the portal' do
    patch "#{url}/archive", headers: headers, as: :json

    expect(response).to have_http_status(:internal_server_error)
    expect(portal.reload.archived).to be(false)
  end
end
