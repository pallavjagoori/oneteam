# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a base drop exposes the id and name of its object.
RSpec.describe BaseDrop do
  it 'reads id and name' do
    drop = described_class.new(Struct.new(:id, :name).new(5, 'Acme'))

    expect([drop.id, drop.name]).to eq([5, 'Acme'])
  end
end
