# frozen_string_literal: true

require 'rails_helper'

# OneTeam: companies sort by last activity with blanks last.
RSpec.describe Company do
  it 'orders by last activity, most recent first' do
    account = create(:account)
    older = create(:company, account: account, last_activity_at: 2.days.ago)
    newer = create(:company, account: account, last_activity_at: 1.hour.ago)
    never = create(:company, account: account, last_activity_at: nil)

    expect(described_class.order_on_last_activity_at('desc').map(&:id)).to eq([newer.id, older.id, never.id])
  end
end
