# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a bulk request with no known operation is refused.
RSpec.describe Contacts::BulkActionService do
  it 'reports an unknown operation' do
    account = create(:account)
    allow(Rails.logger).to receive(:warn)

    result = described_class.new(account: account, user: create(:user, account: account), params: { ids: [1] }).perform

    expect(result).to eq(success: false, error: 'unknown_operation')
    expect(Rails.logger).to have_received(:warn).with('Unknown contact bulk operation payload: [:ids]')
  end
end
