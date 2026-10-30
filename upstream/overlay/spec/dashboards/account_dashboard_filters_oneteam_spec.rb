require 'rails_helper'

# OneTeam coverage for the super admin account list search filters
# ("active:", "suspended:", "recent:", "marked_for_deletion:").
RSpec.describe AccountDashboard do
  let(:filters) { described_class::COLLECTION_FILTERS }
  let!(:active) { create(:account) }
  let!(:suspended) { create(:account, status: :suspended, created_at: 60.days.ago) }
  let!(:marked) { create(:account, custom_attributes: { 'marked_for_deletion_at' => Time.current.iso8601 }, created_at: 60.days.ago) }

  it 'filters accounts by status, age and pending deletion' do
    expect(filters[:active].call(Account.all)).to include(active, marked)
    expect(filters[:suspended].call(Account.all)).to contain_exactly(suspended)
    expect(filters[:recent].call(Account.all)).to contain_exactly(active)
    expect(filters[:marked_for_deletion].call(Account.all)).to contain_exactly(marked)
  end
end
