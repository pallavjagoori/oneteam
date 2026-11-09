require 'rails_helper'

RSpec.describe ContactHelper do
  let(:helper_host) { Class.new { include ContactHelper }.new }

  it 'joins names around a conjunction' do
    expect(helper_host.parse_name('John and Jane Smith')).to include(first_name: 'John Jane', last_name: 'Smith')
  end

  it 'reverses names written as Last, First' do
    expect(helper_host.parse_name('Smith, John Paul')).to include(first_name: 'Paul', last_name: 'Smith')
  end
end
