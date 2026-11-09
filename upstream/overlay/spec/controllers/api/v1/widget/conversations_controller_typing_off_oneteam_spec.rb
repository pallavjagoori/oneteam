require 'rails_helper'

RSpec.describe Api::V1::Widget::ConversationsController do
  it 'broadcasts typing off' do
    controller_instance = described_class.new
    allow(controller_instance).to receive_messages(permitted_params: ActionController::Parameters.new(typing_status: 'off'))
    allow(controller_instance).to receive(:trigger_typing_event)
    allow(controller_instance).to receive(:head)

    controller_instance.toggle_typing

    expect(controller_instance).to have_received(:trigger_typing_event).with(described_class::CONVERSATION_TYPING_OFF)
  end
end
