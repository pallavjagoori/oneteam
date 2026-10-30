require 'rails_helper'

# OneTeam coverage for reading a filter's or attribute's previous type when
# Rails reports the raw enum value (an integer, or an integer as a string).
RSpec.describe Conversations::UnreadCounts::FilteredCountInvalidator do
  subject(:invalidator) { described_class.new(create(:account)) }

  def changes_double(klass, column, before)
    instance_double(klass, previous_changes: { column => [before, nil] })
  end

  it 'maps previous filter types to enum names' do
    expect(invalidator.send(:previous_filter_type, changes_double(CustomFilter, 'filter_type', 0))).to eq('conversation')
    expect(invalidator.send(:previous_filter_type, changes_double(CustomFilter, 'filter_type', '1'))).to eq('contact')
    expect(invalidator.send(:previous_filter_type, changes_double(CustomFilter, 'filter_type', '9'))).to eq('9')
  end

  it 'maps previous attribute models to enum names' do
    definition = ->(before) { changes_double(CustomAttributeDefinition, 'attribute_model', before) }

    expect(invalidator.send(:previous_attribute_model, definition.call(nil))).to be_nil
    expect(invalidator.send(:previous_attribute_model, definition.call('contact_attribute'))).to eq('contact_attribute')
    expect(invalidator.send(:previous_attribute_model, definition.call(0))).to eq('conversation_attribute')
    expect(invalidator.send(:previous_attribute_model, definition.call('2'))).to eq('company_attribute')
    expect(invalidator.send(:previous_attribute_model, definition.call('9'))).to eq('9')
  end
end
