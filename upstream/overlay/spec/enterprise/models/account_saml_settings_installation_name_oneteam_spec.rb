# frozen_string_literal: true

require 'rails_helper'

# OneTeam: SAML settings read the installation name from global config.
RSpec.describe AccountSamlSettings do
  it 'reads the installation name' do
    allow(GlobalConfigService).to receive(:load).and_call_original
    allow(GlobalConfigService).to receive(:load).with('INSTALLATION_NAME', 'Chatwoot').and_return('Acme Desk')

    expect(described_class.new.send(:installation_name)).to eq('Acme Desk')
  end
end
