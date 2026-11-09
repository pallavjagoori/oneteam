require 'rails_helper'

RSpec.describe Platform::Api::V1::EmailChannelMigrationsController do
  it 'has no default IMAP address for other providers' do
    expect(described_class.new.send(:default_imap_address, 'yahoo')).to eq('')
  end
end
