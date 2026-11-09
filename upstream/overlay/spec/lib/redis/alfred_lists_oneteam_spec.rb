require 'rails_helper'

# OneTeam coverage for Redis list helpers.
RSpec.describe Redis::Alfred do
  it 'measures, pops and moves list items' do
    described_class.delete('oneteam:list:a')
    described_class.delete('oneteam:list:b')
    described_class.lpush('oneteam:list:a', %w[one two three])

    expect(described_class.llen('oneteam:list:a')).to eq(3)
    expect(described_class.rpop('oneteam:list:a')).to eq('one')
    expect(described_class.rpoplpush('oneteam:list:a', 'oneteam:list:b')).to eq('two')
    expect(described_class.lrange('oneteam:list:b')).to eq(['two'])
  end
end
