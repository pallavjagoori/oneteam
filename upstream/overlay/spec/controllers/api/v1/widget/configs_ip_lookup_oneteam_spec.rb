require 'rails_helper'

# OneTeam coverage for the widget config endpoint on accounts with IP lookup
# enabled: the new visitor contact records the IP it was created from.
RSpec.describe 'Widget config with IP lookup (OneTeam)', type: :request do
  let(:account) { create(:account) }
  let(:web_widget) { create(:channel_widget, account: account) }

  it 'stores the creating IP on the new contact' do
    account.enable_features!('ip_lookup')

    post '/api/v1/widget/config', params: { website_token: web_widget.website_token }, as: :json

    expect(response).to have_http_status(:success)
    expect(account.contacts.last.additional_attributes['created_at_ip']).to eq('127.0.0.1')
  end
end
