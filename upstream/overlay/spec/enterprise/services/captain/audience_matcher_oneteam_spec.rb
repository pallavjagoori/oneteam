require 'rails_helper'

# OneTeam coverage for the audience conditions Chatwoot's own spec leaves out:
# number comparisons, values that can't be read as numbers or dates (they
# never match), and unknown operators.
RSpec.describe Captain::AudienceMatcher do
  let(:contact) { create(:contact, custom_attributes: { 'orders' => 10, 'plan' => 'gold', 'vip' => true }) }
  let(:conversation) { create(:conversation, contact: contact, account: contact.account) }

  def match?(key, operator, *values)
    described_class.new({ attribute_key: key, filter_operator: operator, values: values }).matches?(contact, conversation)
  end

  it 'compares numbers' do
    expect(match?('orders', 'is_greater_than', '5')).to be(true)
    expect(match?('orders', 'is_less_than', '5')).to be(false)
  end

  it 'never matches a value that is not a number' do
    expect(match?('orders', 'equal_to', 'ten')).to be(false)
    expect(match?('plan', 'is_greater_than', '5')).to be(false)
  end

  it 'never matches days_before for a value that is not a date' do
    expect(match?('vip', 'days_before', '3')).to be(false)
  end

  it 'never matches an unknown operator' do
    expect(match?('plan', 'sounds_like', 'gold')).to be(false)
  end
end
