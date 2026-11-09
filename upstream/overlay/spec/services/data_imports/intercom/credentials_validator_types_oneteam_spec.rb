# frozen_string_literal: true

require 'rails_helper'

# OneTeam: unknown import types are refused before any API call.
RSpec.describe DataImports::Intercom::CredentialsValidator do
  it 'rejects unsupported import types' do
    validator = described_class.new(access_token: 'token', import_types: %w[contacts spaceships])

    expect { validator.send(:validate_parameters!) }.to raise_error(ArgumentError, 'Unsupported import types: spaceships')
  end

  it 'names imports Intercom import by default' do
    expect(DataImports::Intercom::Source.default_import_name).to eq('Intercom import')
  end
end
