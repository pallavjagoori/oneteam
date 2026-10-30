require 'rails_helper'

# OneTeam coverage for the data migration that moves Captain off models
# OpenAI is retiring: the installation default and each account's per-feature
# choices are switched to current models, a custom OpenAI-compatible
# endpoint is left alone, and an account that can't be saved is logged and
# skipped.
RSpec.describe Migration::ReplaceRetiredCaptainModelsJob do
  def store_models(account, models)
    account.update_column(:settings, (account.settings || {}).merge('captain_models' => models)) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'replaces retired models on the installation and on accounts' do
    config = create(:installation_config, name: 'CAPTAIN_OPEN_AI_MODEL', value: 'gpt-4.1-mini')
    retired = create(:account).tap { |account| store_models(account, 'editor' => 'gpt-4.1', 'audio_transcription' => 'whisper-1') }
    current = create(:account).tap { |account| store_models(account, 'editor' => 'gpt-5-mini') }

    described_class.perform_now

    expect(config.reload.value).to eq('gpt-6-luna')
    expect(retired.reload.captain_models).to eq('editor' => 'gpt-6-luna', 'audio_transcription' => 'gpt-transcribe')
    expect(current.reload.captain_models).to eq('editor' => 'gpt-5-mini')
  end

  it 'leaves the installation model alone on a custom endpoint' do
    create(:installation_config, name: 'CAPTAIN_OPEN_AI_ENDPOINT', value: 'https://llm.example.com')
    config = create(:installation_config, name: 'CAPTAIN_OPEN_AI_MODEL', value: 'gpt-4.1')

    described_class.perform_now

    expect(config.reload.value).to eq('gpt-4.1')
  end

  it 'logs and skips an account whose other choices are no longer valid' do
    account = create(:account).tap { |record| store_models(record, 'editor' => 'gpt-4.1', 'not_a_feature' => 'gpt-5-mini') }
    allow(Rails.logger).to receive(:error)

    expect { described_class.perform_now }.not_to raise_error
    expect(account.reload.captain_models).to include('editor' => 'gpt-4.1')
    expect(Rails.logger).to have_received(:error).with(/\[retired-captain-models\] account_id=#{account.id} .*not a known feature/)
  end
end
