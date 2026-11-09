# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an image URL that cannot be parsed has no query parameters.
RSpec.describe CustomMarkdownRenderer do
  it 'reads no parameter from an invalid URL' do
    expect(described_class.new.send(:query_param, 'https://exa mple.com/a.png?cw_image_width=10', 'cw_image_width')).to be_nil
  end
end
