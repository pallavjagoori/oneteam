# frozen_string_literal: true

require 'rails_helper'

# OneTeam: a plain-text upload error is shortened for the log.
RSpec.describe Whatsapp::MediaUploadService do
  it 'truncates a non-JSON error body' do
    response = Struct.new(:body).new('x' * 300)

    expect(described_class.new(nil, nil).send(:error_message, response).length).to eq(200)
  end
end
