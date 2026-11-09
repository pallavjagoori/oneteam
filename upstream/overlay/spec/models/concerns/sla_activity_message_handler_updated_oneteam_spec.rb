require 'rails_helper'

RSpec.describe SlaActivityMessageHandler do
  it 'posts an activity message when the SLA is updated' do
    conversation = create(:conversation)
    allow(Conversations::ActivityMessageJob).to receive(:perform_later)

    conversation.send(:create_sla_change_activity, 'updated', 'Agent')

    expect(Conversations::ActivityMessageJob).to have_received(:perform_later).with(conversation, hash_including(:content))
  end
end
