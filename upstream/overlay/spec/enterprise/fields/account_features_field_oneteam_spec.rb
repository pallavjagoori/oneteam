# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the super admin features field prints its raw data.
RSpec.describe AccountFeaturesField do
  it 'renders its data as text' do
    expect(described_class.new(:features, 'inbox_management', :show).to_s).to eq('inbox_management')
  end
end
