require 'rails_helper'

# OneTeam coverage for LeadSquared setup failures: API errors are reported,
# and activity types that cannot be created are logged.
RSpec.describe Crm::Leadsquared::SetupService do
  let(:hook) { instance_double(Integrations::Hook, account: build(:account), settings: { 'access_key' => 'ak', 'secret_key' => 'sk' }) }
  let(:service) { described_class.new(hook) }

  it 'reports LeadSquared API errors' do
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)
    allow(service).to receive(:setup_endpoint).and_raise(Crm::Leadsquared::Api::BaseClient::ApiError.new('quota'))

    service.setup

    expect(tracker).to have_received(:capture_exception)
  end

  it 'logs activity types it cannot create' do
    allow(service).to receive_messages(activity_types: [{ name: 'Chat', setting_key: 'chat_activity_code' }], find_or_create_activity_type: nil)
    allow(Rails.logger).to receive(:error)

    expect(service.send(:setup_activity_types, [{ 'ActivityEventName' => 'Other' }])).to eq({})
    expect(Rails.logger).to have_received(:error).with('Failed to find or create activity type: Chat')
  end
end
