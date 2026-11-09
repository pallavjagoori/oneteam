# frozen_string_literal: true

require 'rails_helper'

# OneTeam: attachment kinds Messenger does not know are sent as files.
RSpec.describe Facebook::SendOnFacebookService do
  it 'sends unknown attachment kinds as file' do
    attachment = Struct.new(:file_type).new('location')

    expect(described_class.new(message: build(:message)).send(:attachment_type, attachment)).to eq('file')
  end
end
