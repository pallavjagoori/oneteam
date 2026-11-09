require 'rails_helper'

RSpec.describe Conversations::UnreadCounts::FilterQueryCounter do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :administrator) }
  let(:counter) { described_class.new(account: account, user: user, query: { payload: [] }) }

  it 'returns nil for a malformed query' do
    allow(counter).to receive(:valid_query?).and_raise(NoMethodError)

    expect(counter.perform).to be_nil
  end

  it 'accepts AND or OR between queries in any case' do
    expect(counter.send(:query_operator_position_valid?, 'and', false)).to be(true)
    expect(counter.send(:query_operator_position_valid?, 'xor', false)).to be(false)
  end

  it 'accepts boolean words for boolean filters' do
    expect(counter.send(:valid_typed_value?, 'Yes', 'boolean', 'equal_to')).to be(true)
    expect(counter.send(:valid_typed_value?, 'maybe', 'boolean', 'equal_to')).to be(false)
  end
end
