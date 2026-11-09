# frozen_string_literal: true

require 'rails_helper'

# OneTeam: with no branded layout stored at any scope, none is returned.
RSpec.describe EmailTemplate do
  it 'returns nil when no branded layout exists' do
    expect(described_class.branded_layout_for(inbox: nil, account: create(:account))).to be_nil
  end
end
