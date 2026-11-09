# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a named timezone wins; otherwise the offset decides.
RSpec.describe TimezoneHelper do
  let(:host) { Class.new { include TimezoneHelper }.new }

  it 'keeps a valid timezone name' do
    expect(host.timezone_name_from_params('Asia/Tokyo', 0)).to eq('Asia/Tokyo')
  end

  it 'falls back to the offset for an unknown name' do
    expect(host.timezone_name_from_params('Nowhere/Land', nil)).to eq('UTC')
  end
end
