require 'rails_helper'

# OneTeam coverage for asking a WhatsApp contact to share their phone number.
# GET says whether the request can be sent now; POST sends it as a message.
# The WhatsApp services are doubles; their rules have their own specs.
RSpec.describe 'Contact info requests API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:conversation) { create(:conversation, account: account) }
  let(:url) { "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}/contact_info_request" }

  it 'reports whether a request can be sent' do
    eligibility = instance_double(Whatsapp::ContactInfoRequestEligibilityService, availability: { available: true, mode: 'interactive' })
    allow(Whatsapp::ContactInfoRequestEligibilityService).to receive(:new).with(conversation: conversation).and_return(eligibility)

    get url, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq('available' => true, 'mode' => 'interactive')
  end

  it 'sends the request and returns the message' do
    message = create(:message, conversation: conversation, account: account, sender: admin, message_type: :outgoing)
    service = instance_double(Whatsapp::ContactInfoRequestService, perform: message)
    allow(Whatsapp::ContactInfoRequestService).to receive(:new).with(conversation: conversation, sender: admin).and_return(service)

    post url, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['id']).to eq(message.id)
  end

  it 'explains why a request cannot be sent' do
    service = instance_double(Whatsapp::ContactInfoRequestService)
    allow(service).to receive(:perform).and_raise(CustomExceptions::WhatsappContactInfoRequestError.new(reason: 'pending_request'))
    allow(Whatsapp::ContactInfoRequestService).to receive(:new).and_return(service)

    post url, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body).to eq('error' => 'A contact information request is already pending.')
  end
end
