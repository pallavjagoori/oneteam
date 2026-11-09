# frozen_string_literal: true

require 'rails_helper'

# OneTeam: article translations are reported under their own event name.
RSpec.describe Captain::Llm::ArticleTranslationService do
  it 'names its usage event' do
    expect(described_class.allocate.send(:event_name)).to eq('article_translation')
  end
end
