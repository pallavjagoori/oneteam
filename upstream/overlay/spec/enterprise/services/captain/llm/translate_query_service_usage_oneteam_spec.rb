# frozen_string_literal: true

require 'rails_helper'

# OneTeam: query translation is not billed to the account.
RSpec.describe Captain::Llm::TranslateQueryService do
  it 'does not count toward usage' do
    expect(described_class.allocate.send(:counts_toward_usage?)).to be(false)
  end
end
