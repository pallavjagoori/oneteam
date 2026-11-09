require 'rails_helper'

RSpec.describe Public::Api::V1::InboxesController do
  it 'finds any conversation of the contact when the contact inbox is HMAC verified' do
    contact_inbox = create(:contact_inbox, hmac_verified: true)
    other_inbox = create(:inbox, account: contact_inbox.inbox.account)
    conversation = create(:conversation, account: other_inbox.account, inbox: other_inbox, contact: contact_inbox.contact)
    controller_instance = described_class.new
    controller_instance.instance_variable_set(:@contact_inbox, contact_inbox)
    allow(controller_instance).to receive(:params).and_return(ActionController::Parameters.new(conversation_id: conversation.display_id))

    controller_instance.send(:set_conversation)

    expect(controller_instance.instance_variable_get(:@conversation)).to eq(conversation)
  end
end
