require 'rails_helper'

RSpec.describe Migration::RemoveStaleNotificationsJob do
  it 'runs on the scheduled jobs queue' do
    expect(described_class.new.queue_name).to eq('scheduled_jobs')
  end

  it 'destroys messages whose inbox no longer exists and keeps the rest' do
    message = create(:message)
    orphan = create(:message)
    orphan.update_column(:inbox_id, 0) # rubocop:disable Rails/SkipsModelValidations

    described_class.perform_now

    expect(Message.unscoped.exists?(orphan.id)).to be(false)
    expect(Message.exists?(message.id)).to be(true)
  end
end
