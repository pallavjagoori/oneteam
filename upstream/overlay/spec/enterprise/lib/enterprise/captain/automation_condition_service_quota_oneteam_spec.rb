require 'rails_helper'

RSpec.describe Enterprise::Captain::AutomationConditionService do
  it 'treats a monitor quota error as an unmet condition' do
    host = Class.new do
      def perform = raise(CustomExceptions::JevQuotaError.new('monthly_limit', retry_after: 1))
      def unmet = :unmet
    end
    host.prepend(described_class)

    expect(host.new.perform).to eq(:unmet)
  end
end
