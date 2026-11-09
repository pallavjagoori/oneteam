# frozen_string_literal: true

require 'rails_helper'

# OneTeam: LINE files without a usable content type are saved as .bin; the account comes from the inbox.
RSpec.describe Line::IncomingMessageService do
  let(:inbox) { build(:inbox) }
  let(:service) { described_class.new(inbox: inbox, params: {}) }

  it 'falls back to bin for an unknown content type' do
    expect(service.send(:get_file_extension, Struct.new(:content_type).new(nil))).to eq('bin')
  end

  it 'reads the account from the inbox' do
    expect(service.send(:account)).to eq(inbox.account)
  end
end
