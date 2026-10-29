require 'rails_helper'

# OneTeam coverage for the WhatsApp Cloud calling endpoints not covered by
# Chatwoot's specs: accepting and ending a call, a failed call permission
# request, and turning calling on or off for the number. Meta's Graph API is
# faked with WebMock.
RSpec.describe Whatsapp::Providers::WhatsappCloudService do
  let(:channel) do
    create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false).tap do |channel|
      channel.update_columns(provider_config: { 'api_key' => 'token', 'phone_number_id' => '123' }) # rubocop:disable Rails/SkipsModelValidations
    end
  end
  let(:service) { described_class.new(whatsapp_channel: channel) }
  let(:graph) { 'https://graph.facebook.com/v22.0/123' }

  before do
    allow(Rails.logger).to receive(:info)
    allow(Rails.logger).to receive(:error)
  end

  def meta_error(body, status: 400)
    { status: status, body: body.to_json, headers: { 'Content-Type' => 'application/json' } }
  end

  it 'accepts a call with the SDP answer' do
    accept = stub_request(:post, "#{graph}/calls")
             .with(headers: { 'Authorization' => 'Bearer token' },
                   body: { messaging_product: 'whatsapp', call_id: 'wacid_1', action: 'accept',
                           session: { sdp: 'v=0', sdp_type: 'answer' } }.to_json)
             .to_return(status: 200, body: '{}')

    expect(service.accept_call('wacid_1', 'v=0')).to be(true)
    expect(accept).to have_been_requested
  end

  it 'ends a call, logging a failure without the session' do
    stub_request(:post, "#{graph}/calls").with(body: hash_including('action' => 'terminate')).to_return(status: 400, body: 'gone')

    expect(service.terminate_call('wacid_1')).to be(false)
    expect(Rails.logger).to have_received(:info).with(%r{terminate_call POST #{graph}/calls body=\{"messaging_product"})
    expect(Rails.logger).to have_received(:error).with('[WHATSAPP CALL] terminate_call failed: status=400 body=gone')
  end

  it 'logs a failed call permission request and returns nil' do
    stub_request(:post, "#{graph}/messages").to_return(status: 400, body: 'no')

    expect(service.send_call_permission_request('15550001111')).to be_nil
    expect(Rails.logger).to have_received(:error).with(a_string_including('send_call_permission_request failed: status=400'))
  end

  describe '#update_calling_status' do
    it 'turns calling on' do
      update = stub_request(:post, "#{graph}/settings").with(body: { calling: { status: 'ENABLED' } }.to_json).to_return(status: 200)

      expect(service.update_calling_status('ENABLED')).to be(true)
      expect(update).to have_been_requested
    end

    {
      'Meta’s message for the user' => [{ error: { error_user_msg: 'Verify the business first', message: 'x' } }, 'Verify the business first'],
      'the technical message when that is blank' => [{ error: { error_user_msg: '', message: 'Unsupported' } }, 'Unsupported'],
      'the error title as a last resort' => [{ error: { error_user_title: 'Not allowed' } }, 'Not allowed'],
      'a default for an unreadable error' => ['oops', 'Failed to update calling status']
    }.each do |case_name, (body, message)|
      it "raises #{case_name}" do
        stub_request(:post, "#{graph}/settings").to_return(meta_error(body))

        expect { service.update_calling_status('DISABLED') }.to raise_error(RuntimeError, message)
      end
    end

    it 'raises the default when the error is not an object' do
      stub_request(:post, "#{graph}/settings").to_return(meta_error({ error: 'nope' }))

      expect { service.update_calling_status('DISABLED') }.to raise_error('Failed to update calling status')
    end
  end
end
