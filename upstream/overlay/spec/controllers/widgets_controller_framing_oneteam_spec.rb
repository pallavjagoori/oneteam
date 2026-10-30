require 'rails_helper'

# OneTeam coverage for the legacy /widget page: which sites may embed it in
# an iframe, the mobile WebView exception, and recording the visitor's IP
# address when IP lookup is on.
describe '/widget framing', type: :request do
  let(:account) { create(:account) }
  let(:web_widget) { create(:channel_widget, account: account, allowed_domains: 'acme.com, shop.acme.com') }

  it 'limits framing to the allowed domains' do
    get widget_url(website_token: web_widget.website_token)

    expect(response.headers['Content-Security-Policy']).to eq('frame-ancestors acme.com shop.acme.com')
  end

  it 'lets mobile WebViews frame the widget when the inbox allows it' do
    web_widget.update!(allow_mobile_webview: true)

    get widget_url(website_token: web_widget.website_token), headers: { 'Origin' => 'null' }

    expect(response.headers['Content-Security-Policy']).to be_nil
  end

  it 'keeps the domain limit for web origins when the inbox allows WebViews' do
    web_widget.update!(allow_mobile_webview: true)

    get widget_url(website_token: web_widget.website_token), headers: { 'Origin' => 'https://evil.example' }

    expect(response.headers['Content-Security-Policy']).to eq('frame-ancestors acme.com shop.acme.com')
  end

  it "records the visitor's IP address when IP lookup is on" do
    account.enable_features!('ip_lookup')

    get widget_url(website_token: web_widget.website_token)

    expect(account.contacts.last.additional_attributes['created_at_ip']).to eq('127.0.0.1')
  end
end
