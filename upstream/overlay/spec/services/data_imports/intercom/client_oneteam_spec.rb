require 'rails_helper'

# OneTeam coverage for the Intercom API client used by data imports:
# listing and fetching contacts and conversations with the pinned API
# version, and turning failed responses into authentication, rate limit or
# general errors that carry Intercom's own message.
RSpec.describe DataImports::Intercom::Client do
  let(:client) { described_class.new(access_token: 'intercom-token') }
  let(:headers) { { 'Authorization' => 'Bearer intercom-token', 'Intercom-Version' => '2.15' } }

  def stub_intercom(path, status: 200, body: {}, query: {}, response_headers: {})
    stub_request(:get, "https://api.intercom.io#{path}").with(headers: headers, query: query)
                                                        .to_return(status: status, body: body.is_a?(String) ? body : body.to_json,
                                                                   headers: { 'Content-Type' => 'application/json' }.merge(response_headers))
  end

  it 'lists and fetches contacts and conversations' do
    stub_intercom('/contacts', query: { per_page: 50 }, body: { data: ['contact'] })
    stub_intercom('/conversations', query: { per_page: 10, starting_after: 'abc' }, body: { conversations: ['c'] })
    stub_intercom('/conversations/7', body: { id: '7' })
    stub_intercom('/contacts/9', body: { id: '9' })

    expect(client.list_contacts).to eq('data' => ['contact'])
    expect(client.list_conversations(starting_after: 'abc', per_page: 10)).to eq('conversations' => ['c'])
    expect(client.retrieve_conversation(7)).to eq('id' => '7')
    expect(client.retrieve_contact(9)).to eq('id' => '9')
  end

  it 'reads an empty or malformed body as an empty hash' do
    stub_intercom('/contacts/1', body: '')
    stub_intercom('/contacts/2', body: '{not json')

    expect(client.retrieve_contact(1)).to eq({})
    expect(client.retrieve_contact(2)).to eq({})
  end

  it 'raises an authentication error with Intercom’s message' do
    stub_intercom('/contacts/1', status: 401, body: { errors: [{ message: 'Access Token Invalid' }] })

    expect { client.retrieve_contact(1) }.to raise_error(described_class::AuthenticationError, 'Access Token Invalid') { |e|
      expect(e.status).to eq(401)
    }
  end

  it 'raises a rate limit error with the retry delay' do
    stub_intercom('/contacts/1', status: 429, body: {}, response_headers: { 'Retry-After' => '30' })

    expect { client.retrieve_contact(1) }.to raise_error(described_class::RateLimitError, 'Intercom API request failed with status 429') { |e|
      expect(e.retry_after).to eq('30')
    }
  end

  it 'raises a general error for other failures' do
    stub_intercom('/contacts/1', status: 500, body: { errors: 'broken' })

    expect { client.retrieve_contact(1) }.to raise_error(described_class::Error, 'Intercom API request failed with status 500') { |e|
      expect(e.body).to eq('errors' => 'broken')
    }
  end
end
