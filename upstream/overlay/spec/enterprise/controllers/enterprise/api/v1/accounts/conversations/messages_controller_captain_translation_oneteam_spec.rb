require 'rails_helper'

RSpec.describe Enterprise::Api::V1::Accounts::Conversations::MessagesController do
  it 'translates with Captain when the account uses it' do
    conversation = create(:conversation)
    controller_instance = Api::V1::Accounts::Conversations::MessagesController.new
    controller_instance.instance_variable_set(:@conversation, conversation)
    allow(controller_instance).to receive_messages(
      translation_provider: 'captain', message: instance_double(Message, content: 'Hola'),
      permitted_params: ActionController::Parameters.new(target_language: 'en')
    )
    translator = instance_double(Captain::Conversation::TranslatorService, translate: 'Hello')
    allow(Captain::Conversation::TranslatorService).to receive(:new).and_return(translator)
    Current.account = conversation.account

    expect(controller_instance.send(:translate_message)).to eq('Hello')
    expect(translator).to have_received(:translate).with('Hola', 'en')
  ensure
    Current.reset
  end
end
