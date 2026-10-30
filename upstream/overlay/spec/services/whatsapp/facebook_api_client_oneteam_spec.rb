require 'rails_helper'

# OneTeam coverage for the WhatsApp Graph API reads that Chatwoot's spec
# leaves out: paging through a business account's phone numbers, the
# template, profile, permission, subscription and phone number lookups,
# the phone verification check and removing the app's subscription. Each
# call sends the access token as a bearer header and raises on an error.
describe Whatsapp::FacebookApiClient do
  let(:client) { described_class.new('token') }
  let(:graph) { 'https://graph.facebook.com/v22.0' }
  let(:auth) { { 'Authorization' => 'Bearer token' } }

  before { allow(GlobalConfigService).to receive(:load).and_call_original }

  def stub_graph(method, path, body, status: 200, query: {})
    stub_request(method, "#{graph}/#{path}").with(headers: auth, query: query)
                                            .to_return(status: status, body: body.to_json, headers: { 'Content-Type' => 'application/json' })
  end

  it 'pages through every phone number on the business account' do
    stub_graph(:get, 'waba/phone_numbers', { data: [{ id: '1' }], paging: { next: 'more', cursors: { after: 'c1' } } })
    stub_graph(:get, 'waba/phone_numbers', { paging: {} }, query: { after: 'c1' })

    expect(client.fetch_all_phone_numbers('waba')).to eq([{ 'id' => '1' }])
  end

  it 'reads templates, profile, permissions, subscriptions and a phone number' do
    stub_graph(:get, 'waba/message_templates', { data: ['t'] }, query: { limit: 1 })
    stub_graph(:get, 'pn/whatsapp_business_profile', { data: ['p'] }, query: { fields: 'about' })
    stub_graph(:get, 'me/permissions', { data: ['perm'] })
    stub_graph(:get, 'waba/subscribed_apps', { data: ['app'] })
    stub_graph(:get, 'pn', { id: 'pn' }, query: { fields: 'status' })
    stub_graph(:get, 'other', { id: 'other' })

    expect(client.fetch_message_templates('waba')).to eq('data' => ['t'])
    expect(client.fetch_business_profile('pn')).to eq('data' => ['p'])
    expect(client.fetch_permissions).to eq('data' => ['perm'])
    expect(client.fetch_subscribed_apps('waba')).to eq('data' => ['app'])
    expect(client.fetch_phone_number('pn', fields: 'status')).to eq('id' => 'pn')
    expect(client.fetch_phone_number('other')).to eq('id' => 'other')
  end

  it 'treats a connected or code-verified number as verified' do
    query = { fields: 'status,code_verification_status' }
    stub_graph(:get, 'a', { status: 'CONNECTED' }, query: query)
    stub_graph(:get, 'b', { status: 'PENDING', code_verification_status: 'VERIFIED' }, query: query)
    stub_graph(:get, 'c', { status: 'PENDING', code_verification_status: 'NOT_VERIFIED' }, query: query)

    expect([client.phone_number_verified?('a'), client.phone_number_verified?('b'), client.phone_number_verified?('c')])
      .to eq([true, true, false])
  end

  it 'removes the app subscription and raises when Meta refuses' do
    stub_graph(:delete, 'waba/subscribed_apps', { success: true })
    stub_graph(:delete, 'gone/subscribed_apps', { error: 'nope' }, status: 400)

    expect(client.unsubscribe_app_from_waba('waba')).to eq('success' => true)
    expect { client.unsubscribe_app_from_waba('gone') }.to raise_error(/WABA app unsubscription failed/)
  end
end
