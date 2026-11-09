require 'rails_helper'

# OneTeam coverage for the ActionCable connection class. Channel specs use a
# stub connection, so nothing else loads it.
RSpec.describe ApplicationCable::Connection do
  it 'is a plain ActionCable connection' do
    expect(described_class.superclass).to eq(ActionCable::Connection::Base)
  end
end
