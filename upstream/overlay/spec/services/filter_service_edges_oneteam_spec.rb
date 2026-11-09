require 'rails_helper'

# OneTeam coverage for FilterService helpers: an attribute that is not a
# standard filter, comparisons on attributes that are not dates or numbers,
# and the negative LIKE operator.
RSpec.describe FilterService do
  let(:service) { described_class.new({ payload: [] }, create(:user)) }

  it 'has no data type for unknown attributes' do
    expect(service.send(:standard_attribute_data_type, 'not_a_filter')).to be_nil
  end

  it 'rejects greater-than comparisons on text attributes' do
    expect { service.send(:coerce_lt_gt_value, 'abc', 'text', 'name') }
      .to raise_error(CustomExceptions::CustomFilter::InvalidValue)
  end

  it 'builds a NOT LIKE clause for other operators' do
    expect(service.send(:like_filter_string, 'does_not_contain', 2)).to eq('NOT LIKE :value_2')
  end
end
