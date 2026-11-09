# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an email address with backticks skips liquid and is returned as is.
RSpec.describe EmailHelper do
  it 'returns a backticked email address unchanged' do
    expect(helper.parse_email_variables(nil, 'a`b`@example.com')).to eq('a`b`@example.com')
  end
end
