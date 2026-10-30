require 'rails_helper'

# OneTeam coverage for identity verification on the public contacts API: a
# correct identifier hash marks the contact as verified, and a wrong or
# missing hash is rejected when the inbox makes verification mandatory.
RSpec.describe 'Public Inbox Contacts API identity verification', type: :request do
  let(:api_channel) { create(:channel_api, hmac_mandatory: true) }
  let(:contact_inbox) { create(:contact_inbox, contact: create(:contact), inbox: api_channel.inbox) }
  let(:url) { "/public/api/v1/inboxes/#{api_channel.identifier}/contacts/#{contact_inbox.source_id}" }

  def identifier_hash(identifier)
    OpenSSL::HMAC.hexdigest('sha256', api_channel.hmac_token, identifier)
  end

  it 'marks the contact as verified when the hash matches' do
    get url, params: { identifier: 'user-1', identifier_hash: identifier_hash('user-1') }

    expect(response).to have_http_status(:success)
    expect(contact_inbox.reload.hmac_verified).to be(true)
  end

  it 'rejects a hash that does not match' do
    get url, params: { identifier: 'user-1', identifier_hash: identifier_hash('user-2') }

    expect(response).to have_http_status(:internal_server_error)
    expect(contact_inbox.reload.hmac_verified).to be(false)
  end

  it 'rejects a hash of the wrong length' do
    get url, params: { identifier: 'user-1', identifier_hash: 'short' }

    expect(response).to have_http_status(:internal_server_error)
  end
end
