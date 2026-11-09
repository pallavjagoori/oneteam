# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an unparseable help center URL still yields its host part.
RSpec.describe PortalInstructionsMailer do
  it 'strips the scheme and path from an invalid URL' do
    expect(described_class.new.send(:extract_hostname, 'https://help center.example.com/docs')).to eq('help center.example.com')
  end
end
