# frozen_string_literal: true

require 'rails_helper'

# OneTeam: the translation client is configured with the hook credentials.
RSpec.describe Integrations::GoogleTranslate::DetectLanguageService do
  it 'passes the hook credentials to the client' do
    config = Struct.new(:credentials).new
    allow(Google::Cloud::Translate::V3::TranslationService::Client).to receive(:new).and_yield(config).and_return(:client)
    hook = instance_double(Integrations::Hook, settings: { 'credentials' => { 'project_id' => 'p' } })

    expect(described_class.new(hook: hook, message: nil).send(:client)).to eq(:client)
    expect(config.credentials).to eq('project_id' => 'p')
  end
end
