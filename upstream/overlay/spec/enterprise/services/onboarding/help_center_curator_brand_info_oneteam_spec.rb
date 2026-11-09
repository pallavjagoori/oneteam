# frozen_string_literal: true

require 'rails_helper'

# OneTeam: brand info from the account is read with symbol keys.
RSpec.describe Onboarding::HelpCenterCurator do
  it 'reads brand info with symbol keys' do
    account = create(:account, custom_attributes: { 'brand_info' => { 'name' => 'Acme', 'colors' => { 'primary' => '#000' } } })

    expect(described_class.new(account: account).send(:brand_info)).to eq(name: 'Acme', colors: { primary: '#000' })
  end
end
