require 'rails_helper'

# OneTeam coverage for the checks behind WhatsApp manual setup (version 2):
# before a number is connected, Meta must confirm that the phone number
# belongs to the WABA, is verified, is not used by another inbox, and that the
# token can read templates and send messages. Meta's API client is a double.
RSpec.describe Whatsapp::ManualSetupValidationService do
  subject(:service) { described_class.new(**credentials) }

  let(:credentials) { { waba_id: 'waba-1', phone_number_id: 'phone-1', access_token: 'token' } }

  let(:api_client) { instance_double(Whatsapp::FacebookApiClient) }
  let(:phone) do
    { 'id' => 'phone-1', 'display_phone_number' => '+1 (555) 010-2000', 'verified_name' => 'Acme' }
  end
  let(:granted) { { 'data' => [{ 'permission' => 'whatsapp_business_messaging', 'status' => 'granted' }] } }

  before do
    allow(Whatsapp::FacebookApiClient).to receive(:new).with('token').and_return(api_client)
    allow(api_client).to receive_messages(
      fetch_all_phone_numbers: [phone, { 'id' => 'phone-2' }],
      fetch_phone_number: { 'status' => 'CONNECTED', 'code_verification_status' => 'NOT_VERIFIED' },
      fetch_message_templates: { 'data' => [] },
      fetch_permissions: granted
    )
  end

  it 'returns a preview of the number when every check passes' do
    expect(service.perform).to eq(
      verified_name: 'Acme',
      display_phone_number: '+15550102000',
      phone_number_id: 'phone-1',
      waba_id: 'waba-1',
      template_access: true,
      suggested_inbox_name: 'Acme WhatsApp'
    )
    expect(api_client).to have_received(:fetch_phone_number).with('phone-1', fields: 'status,code_verification_status')
  end

  it 'names the inbox after the number when Meta has no verified name' do
    phone['verified_name'] = ''
    allow(api_client).to receive(:fetch_phone_number).and_return('status' => 'PENDING', 'code_verification_status' => 'VERIFIED')

    expect(service.perform[:suggested_inbox_name]).to eq('+15550102000 WhatsApp')
  end

  {
    waba_id: 'WABA ID is required',
    phone_number_id: 'Phone Number ID is required',
    access_token: 'Access token is required'
  }.each do |field, message|
    it "requires the #{field}" do
      allow(Whatsapp::FacebookApiClient).to receive(:new).and_return(api_client)

      expect { described_class.new(**credentials, field => '').perform }.to raise_error(ArgumentError, message)
    end
  end

  it 'rejects a phone number that is not in the WABA' do
    allow(api_client).to receive(:fetch_all_phone_numbers).and_return([{ 'id' => 'other' }, {}])

    expect { service.perform }.to raise_error(ArgumentError, /does not belong to the WABA ID/)
  end

  it 'rejects a number that Meta has not verified' do
    allow(api_client).to receive(:fetch_phone_number).and_return('status' => 'PENDING')

    expect { service.perform }.to raise_error(ArgumentError, /Complete phone number verification/)
  end

  it 'rejects a number already connected to another inbox' do
    create(:channel_whatsapp, phone_number: '+15550102000', sync_templates: false, validate_provider_config: false)

    expect { service.perform }.to raise_error(ArgumentError, /already connected to another inbox/)
  end

  it 'rejects a phone number id already used by another inbox' do
    create(:channel_whatsapp, provider_config: { 'phone_number_id' => 'phone-1' }, sync_templates: false, validate_provider_config: false)

    expect { service.perform }.to raise_error(ArgumentError, /Phone Number ID is already used/)
  end

  it 'explains a token that cannot read message templates' do
    allow(api_client).to receive(:fetch_message_templates).and_raise(StandardError, 'forbidden')

    expect { service.perform }.to raise_error(ArgumentError, /whatsapp_business_management permission/)
  end

  [
    { 'data' => [{ 'permission' => 'whatsapp_business_messaging', 'status' => 'declined' }] },
    { 'data' => ['whatsapp_business_messaging'] },
    {}
  ].each do |permissions|
    it "explains a token without messaging permission (#{permissions.inspect})" do
      allow(api_client).to receive(:fetch_permissions).and_return(permissions)

      expect { service.perform }.to raise_error(ArgumentError, /whatsapp_business_messaging permission/)
    end
  end
end
