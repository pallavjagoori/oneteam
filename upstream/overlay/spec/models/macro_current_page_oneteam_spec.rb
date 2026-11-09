require 'rails_helper'

# OneTeam coverage: macro listings start on page 1 unless a page is given.
RSpec.describe Macro do
  it 'defaults to the first page' do
    expect(described_class.current_page({})).to eq(1)
    expect(described_class.current_page(page: 3)).to eq(3)
  end
end
