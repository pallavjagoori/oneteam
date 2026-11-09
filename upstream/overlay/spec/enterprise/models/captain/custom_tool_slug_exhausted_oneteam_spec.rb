# frozen_string_literal: true

require 'rails_helper'

# OneTeam: when every random slug suffix is taken, slug generation gives up.
RSpec.describe Captain::CustomTool do
  it 'raises after five colliding slug candidates' do
    tool = described_class.new
    allow(tool).to receive(:slug_exists?).and_return(true)

    expect { tool.send(:find_unique_slug, 'custom_tool_lookup') }
      .to raise_error(ActiveRecord::RecordNotUnique, I18n.t('captain.custom_tool.slug_generation_failed'))
    expect(tool).to have_received(:slug_exists?).exactly(6).times
  end
end
