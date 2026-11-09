# frozen_string_literal: true

require 'rails_helper'

# OneTeam: SLA titles use the conversation id; in the community edition (the enterprise
# voice module replaces push_message_body) missed voice calls have no push body.
RSpec.describe Notification do
  it 'titles an SLA breach with the conversation display id' do
    notification = create(:notification, notification_type: 'sla_missed_resolution')

    expect(notification.push_message_title).to include(notification.primary_actor.display_id.to_s)
  end

  it 'has an empty body for a missed voice call in the community edition' do
    method = described_class.instance_method(:push_message_body)
    method = method.super_method until method.owner == described_class

    expect(method.bind_call(create(:notification, notification_type: 'voice_call_missed'))).to eq('')
  end
end
