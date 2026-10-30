require 'rails_helper'

# OneTeam coverage for LeadSquared sync errors and contacts that cannot be
# matched to a lead.
RSpec.describe Crm::Leadsquared::ProcessorService do
  let(:account) { create(:account) }
  let(:hook) do
    create(:integrations_hook, :leadsquared, account: account, settings: {
             'access_key' => 'key', 'secret_key' => 'secret', 'endpoint_url' => 'https://api.leadsquared.com/v2',
             'enable_conversation_activity' => true, 'conversation_activity_code' => 1001
           })
  end
  let(:lead_client) { instance_double(Crm::Leadsquared::Api::LeadClient) }
  let(:activity_client) { instance_double(Crm::Leadsquared::Api::ActivityClient) }
  let(:service) { described_class.new(hook) }

  before do
    account.enable_features('crm_integration')
    allow(Crm::Leadsquared::Api::LeadClient).to receive(:new).and_return(lead_client)
    allow(Crm::Leadsquared::Api::ActivityClient).to receive(:new).and_return(activity_client)
    allow(Rails.logger).to receive(:error)
    allow(Rails.logger).to receive(:info)
  end

  it 'logs unexpected errors while saving a lead' do
    contact = create(:contact, account: account, email: 'lead@example.com')
    allow(lead_client).to receive(:create_or_update_lead).and_raise(StandardError, 'boom')

    service.handle_contact(contact)

    expect(Rails.logger).to have_received(:error).with('Error processing contact in LeadSquared: boom')
  end

  it 'skips the activity when the contact cannot be identified' do
    contact = create(:contact, account: account, email: nil, phone_number: nil)
    conversation = create(:conversation, account: account, contact: contact)
    allow(activity_client).to receive(:post_activity)

    service.handle_conversation_created(conversation)

    expect(Rails.logger).to have_received(:info).with("Contact not identifiable. Skipping activity for ##{contact.id}")
    expect(activity_client).not_to have_received(:post_activity)
  end

  it 'does not treat an unreadable error response as a missing lead' do
    error = instance_double(Crm::Leadsquared::Api::BaseClient::ApiError)
    allow(error).to receive(:response).and_raise(StandardError)

    expect(service.send(:lead_not_found_error?, error)).to be(false)
  end
end
