# frozen_string_literal: true

require 'rails_helper'

# OneTeam: failing to clear the creating flag is logged, not raised.
RSpec.describe Enterprise::CreateStripeCustomerJob do
  it 'logs when the flag cannot be cleared' do
    account = create(:account)
    allow(Account).to receive(:where).and_raise(ActiveRecord::StatementInvalid, 'db down')
    allow(Rails.logger).to receive(:error)

    described_class.new.send(:clear_creating_flag, account)

    expect(Rails.logger).to have_received(:error).with(/\AFailed to clear is_creating_customer flag for account=#{account.id}: /)
  end
end
