require 'rails_helper'

# OneTeam coverage for platform banner filters and labels in super admin.
RSpec.describe PlatformBannerDashboard do
  it 'filters banners by type' do
    filters = described_class::COLLECTION_FILTERS

    %i[warning error feature_announcement].each do |type|
      expect(filters[type].call(PlatformBanner.all).to_sql).to include('banner_type')
    end
  end

  it 'labels a banner by id and type' do
    banner = PlatformBanner.new(id: 4, banner_type: :warning)

    expect(described_class.new.display_resource(banner)).to eq('Banner #4 (warning)')
  end
end
