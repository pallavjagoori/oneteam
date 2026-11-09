require 'rails_helper'

# OneTeam coverage for building both unread count caches in one call.
RSpec.describe Conversations::UnreadCounts::Builder do
  it 'builds the base and assignment caches' do
    builder = described_class.new(create(:account))
    allow(builder).to receive(:build_base!)
    allow(builder).to receive(:build_assignment!)

    builder.build_all!

    expect(builder).to have_received(:build_base!).ordered
    expect(builder).to have_received(:build_assignment!).ordered
  end
end
