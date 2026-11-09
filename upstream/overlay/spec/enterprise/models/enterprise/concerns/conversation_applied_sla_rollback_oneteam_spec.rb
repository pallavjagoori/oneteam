require 'rails_helper'

RSpec.describe Enterprise::Concerns::Conversation do
  it 'rolls back when the SLA record is invalid' do
    conversation = create(:conversation)

    expect { conversation.send(:ensure_applied_sla_is_created) { raise ActiveRecord::RecordInvalid } }
      .to raise_error(ActiveRecord::Rollback)
  end
end
