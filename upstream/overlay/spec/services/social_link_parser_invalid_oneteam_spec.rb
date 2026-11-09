# frozen_string_literal: true

require 'rails_helper'

# OneTeam: links that cannot be parsed are skipped.
RSpec.describe SocialLinkParser do
  let(:host) { Class.new { include SocialLinkParser }.new }

  it 'skips unparseable links when searching and parsing' do
    expect(host.send(:find_social_handle, ['https://face book.com/acme'], :facebook, %w[facebook.com])).to be_nil
    expect(host.send(:parse_social_handle, :facebook, 'https://face book.com/acme')).to be_nil
  end
end
