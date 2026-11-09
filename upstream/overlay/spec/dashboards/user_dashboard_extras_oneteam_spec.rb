require 'rails_helper'

# OneTeam coverage for the super admin user dashboard: the avatar delete URL
# and the confirmed, unconfirmed and recent users filters.
RSpec.describe UserDashboard do
  it 'routes avatar deletion to the super admin user avatar endpoint' do
    destroy_url = described_class::ATTRIBUTE_TYPES[:avatar].options[:destroy_url]

    expect(destroy_url.call(:super_admin, nil, Struct.new(:id).new(9))).to eq([:avatar_super_admin_user, { attachment_id: 9 }])
  end

  it 'filters confirmed users' do
    confirmed = create(:user, confirmed_at: Time.current)

    expect(described_class::COLLECTION_FILTERS[:confirmed].call(User.all)).to include(confirmed)
  end

  it 'filters unconfirmed users' do
    unconfirmed = create(:user, skip_confirmation: false)

    expect(described_class::COLLECTION_FILTERS[:unconfirmed].call(User.all)).to include(unconfirmed)
  end

  it 'filters users created in the last 30 days' do
    recent = create(:user)

    expect(described_class::COLLECTION_FILTERS[:recent].call(User.all)).to include(recent)
  end
end
