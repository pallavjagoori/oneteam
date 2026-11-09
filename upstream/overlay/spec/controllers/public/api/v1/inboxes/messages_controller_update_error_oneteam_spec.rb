require 'rails_helper'

RSpec.describe Public::Api::V1::Inboxes::MessagesController do
  it 'answers 500 with the error when the message update fails' do
    controller_instance = described_class.new
    message = instance_double(Message)
    allow(message).to receive(:update!).and_raise(StandardError, 'write failed')
    controller_instance.instance_variable_set(:@message, message)
    controller_instance.instance_variable_set(:@contact, Contact.new)
    allow(controller_instance).to receive_messages(check_csat_locked: false, message_update_params: {})
    allow(controller_instance).to receive(:render)

    controller_instance.update

    expect(controller_instance).to have_received(:render).with(json: include('write failed'), status: :internal_server_error)
  end
end
