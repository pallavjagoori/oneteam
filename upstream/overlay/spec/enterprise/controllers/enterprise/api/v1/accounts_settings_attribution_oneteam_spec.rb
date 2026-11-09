require 'rails_helper'

RSpec.describe Enterprise::Api::V1::AccountsSettings do
  it 'reports marketing attribution failures without failing signup' do
    controller_instance = Api::V1::AccountsController.new
    controller_instance.instance_variable_set(:@account, create(:account))
    allow(controller_instance).to receive_messages(current_user: nil, cookies: {})
    allow(Internal::Accounts::MarketingAttributionService).to receive(:new).and_raise(StandardError, 'boom')
    tracker = instance_double(ChatwootExceptionTracker, capture_exception: true)
    allow(ChatwootExceptionTracker).to receive(:new).and_return(tracker)

    controller_instance.send(:record_marketing_attribution)

    expect(tracker).to have_received(:capture_exception)
  end
end
