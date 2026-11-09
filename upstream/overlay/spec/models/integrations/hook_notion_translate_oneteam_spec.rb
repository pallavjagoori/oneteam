# frozen_string_literal: true

require 'rails_helper'

# OneTeam: Notion hooks are recognised, and bad Google Translate credentials are refused.
RSpec.describe Integrations::Hook do
  it 'recognises a Notion hook' do
    expect(described_class.new(app_id: 'notion').notion?).to be(true)
  end

  it 'refuses invalid Google Translate credentials' do
    allow(Integrations::GoogleTranslate::CredentialsValidator).to receive(:valid?).and_return(false)
    hook = described_class.new(app_id: 'google_translate', account: create(:account))
    hook.send(:validate_google_translate_credentials)

    expect(hook.errors[:base]).to include(I18n.t('errors.google_translate.invalid_credentials'))
  end
end
