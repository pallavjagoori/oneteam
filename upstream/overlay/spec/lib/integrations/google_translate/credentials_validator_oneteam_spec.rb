require 'rails_helper'

# OneTeam coverage for checking Google Translate credentials before the
# integration is saved: a service-account key must have a client email and a
# private key, and must be able to detect a language.
RSpec.describe Integrations::GoogleTranslate::CredentialsValidator do
  let(:hook) { build(:integrations_hook, app_id: 'google_translate', settings: { 'credentials' => credentials }) }
  let(:credentials) { { 'client_email' => 'bot@example.iam.gserviceaccount.com', 'private_key' => 'key', 'project_id' => 'p' } }
  let(:processor) { instance_double(Integrations::GoogleTranslate::ProcessorService) }

  before { allow(Integrations::GoogleTranslate::ProcessorService).to receive(:new).and_return(processor) }

  it 'accepts credentials that can detect a language' do
    allow(processor).to receive(:detect).with('Hello').and_return('en')

    expect(described_class.valid?(hook)).to be(true)
  end

  it 'rejects credentials Google refuses' do
    allow(Rails.logger).to receive(:warn)
    allow(processor).to receive(:detect).and_raise(Signet::AuthorizationError, 'invalid_grant')

    expect(described_class.valid?(hook)).to be(false)
    expect(Rails.logger).to have_received(:warn).with('[google-translate-validator] Signet::AuthorizationError: invalid_grant')
  end

  context 'when the key is missing fields' do
    let(:credentials) { { 'client_email' => 'bot@example.iam.gserviceaccount.com' } }

    it 'rejects it without calling Google' do
      expect(described_class.valid?(hook)).to be(false)
      expect(Integrations::GoogleTranslate::ProcessorService).not_to have_received(:new)
    end
  end
end
