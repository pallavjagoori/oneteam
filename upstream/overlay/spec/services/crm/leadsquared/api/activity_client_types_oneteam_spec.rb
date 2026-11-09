# frozen_string_literal: true

require 'rails_helper'

# OneTeam: activity types come from the ActivityTypes.Get endpoint, and an
# unreadable duplicate-phone error is treated as not a duplicate.
RSpec.describe Crm::Leadsquared::Api::ActivityClient do
  let(:client) { described_class.new('key', 'secret', 'https://api.leadsquared.example') }

  it 'fetches the activity types' do
    allow(client).to receive(:get).with('ProspectActivity.svc/ActivityTypes.Get').and_return([{ 'Value' => 1 }])

    expect(client.fetch_activity_types).to eq([{ 'Value' => 1 }])
  end

  it 'treats an unreadable duplicate error as not a duplicate' do
    lead_client = Crm::Leadsquared::Api::LeadClient.new('key', 'secret', 'https://api.leadsquared.example')
    response = instance_double(HTTParty::Response, blank?: false)
    allow(response).to receive(:parsed_response).and_raise(JSON::ParserError)
    error = Crm::Leadsquared::Api::BaseClient::ApiError.new('dup', 500, response)

    expect(lead_client.send(:duplicate_phone_error?, error)).to be(false)
  end
end
