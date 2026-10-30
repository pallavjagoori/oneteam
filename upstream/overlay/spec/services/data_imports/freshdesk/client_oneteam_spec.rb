require 'rails_helper'

# OneTeam coverage for the Freshdesk API calls Chatwoot's spec leaves out:
# fetching a contact or ticket, paging a ticket's conversation, rejecting a
# domain URI cannot parse, and the authentication and general errors.
RSpec.describe DataImports::Freshdesk::Client do
  let(:client) { described_class.new(domain: 'acme', api_key: 'key') }
  let(:api) { 'https://acme.freshdesk.com/api/v2' }

  def stub_freshdesk(path, status: 200, body: {}, query: {})
    stub_request(:get, "#{api}#{path}").with(basic_auth: %w[key X], query: query)
                                       .to_return(status: status, body: body.to_json, headers: { 'Content-Type' => 'application/json' })
  end

  it 'rejects a domain that is not a valid URI' do
    expect { described_class.normalize_domain('https://acme freshdesk.com') }.to raise_error(ArgumentError, /valid Freshdesk domain/)
  end

  it 'fetches a contact, a ticket with its requester and a page of replies' do
    stub_freshdesk('/contacts/5', body: { id: 5 })
    stub_freshdesk('/tickets/8', query: { include: 'requester' }, body: { id: 8 })
    stub_freshdesk('/tickets/8/conversations', query: { page: 1, per_page: 100 }, body: [{ id: 1 }])

    expect(client.retrieve_contact(5)).to eq('id' => 5)
    expect(client.retrieve_ticket(8)).to eq('id' => 8)
    expect(client.list_conversations(8).data).to eq([{ 'id' => 1 }])
  end

  it 'raises authentication and general errors' do
    stub_freshdesk('/contacts/1', status: 403, body: { description: 'Not allowed' })
    stub_request(:get, "#{api}/contacts/2").with(basic_auth: %w[key X]).to_return(status: 502, body: '{oops',
                                                                                  headers: { 'Content-Type' => 'application/json' })

    expect { client.retrieve_contact(1) }.to raise_error(described_class::AuthenticationError, 'Not allowed')
    expect { client.retrieve_contact(2) }.to raise_error(described_class::Error, 'Freshdesk API request failed with status 502')
  end
end
