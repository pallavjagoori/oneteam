# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the community edition never treats a contact inbox as an anonymous
# caller (the enterprise voice module replaces this method).
RSpec.describe ContactInbox do
  it 'is never an anonymous caller in the community edition' do
    method = described_class.instance_method(:anonymous_caller?)
    method = method.super_method until method.owner == described_class

    expect(method.bind_call(create(:contact_inbox))).to be(false)
  end
end
