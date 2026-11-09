require 'rails_helper'

RSpec.describe Public::Api::V1::Portals::ArticlesController do
  it 'loads the category from the slug and locale' do
    portal = create(:portal)
    category = create(:category, portal: portal, account: portal.account, slug: 'billing', locale: 'en')
    controller_instance = described_class.new
    controller_instance.instance_variable_set(:@portal, portal)
    allow(controller_instance).to receive(:permitted_params).and_return(ActionController::Parameters.new(category_slug: 'billing', locale: 'en'))

    controller_instance.send(:set_category)

    expect(controller_instance.instance_variable_get(:@category)).to eq(category)
  end
end
