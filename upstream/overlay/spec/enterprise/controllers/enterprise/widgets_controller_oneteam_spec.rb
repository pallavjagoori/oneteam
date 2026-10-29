require 'rails_helper'

# OneTeam coverage for the Enterprise country allow-list on the website
# widget: visitors from countries the account has not allowed are refused,
# and visitors whose location can't be looked up are let through.
RSpec.describe 'Enterprise widget country allow-list', type: :request do
  let(:account) { create(:account, custom_attributes: { 'allowed_countries' => %w[IN US] }) }
  let(:web_widget) { create(:channel_widget, account: account) }
  let(:ip_lookup) { instance_double(IpLookupService) }

  before { allow(IpLookupService).to receive(:new).and_return(ip_lookup) }

  def visit_widget
    get widget_url(website_token: web_widget.website_token)
  end

  it 'serves visitors from an allowed country' do
    allow(ip_lookup).to receive(:perform).and_return(Struct.new(:country_code).new('IN'))

    visit_widget

    expect(response).to be_successful
  end

  it 'refuses visitors from other countries' do
    allow(ip_lookup).to receive(:perform).and_return(Struct.new(:country_code).new('FR'))

    visit_widget

    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body).to eq('error' => 'Location is not supported')
  end

  it 'serves visitors whose location is unknown' do
    allow(ip_lookup).to receive(:perform).and_return(nil)

    visit_widget

    expect(response).to be_successful
  end
end
