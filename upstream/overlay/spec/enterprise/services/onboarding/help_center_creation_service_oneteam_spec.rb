require 'rails_helper'

# OneTeam coverage for the onboarding help center's brand logo (the first
# usable logo URL is downloaded and attached; a failure is only logged), a
# failed article-generation enqueue, and the random slug used when the
# account name gives none.
RSpec.describe Onboarding::HelpCenterCreationService do
  let(:brand_info) { { 'logos' => [{ 'url' => '' }, 'https://cdn.example/logo.png'] } }
  let(:account) { create(:account, name: 'Acme', custom_attributes: { 'brand_info' => brand_info }) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:logo_file) do
    Struct.new(:tempfile, :original_filename, :content_type)
          .new(Rails.root.join('spec/assets/avatar.png').open, 'logo.png', 'image/png')
  end

  before { allow(Rails.logger).to receive(:error) }

  it 'attaches the first usable brand logo' do
    allow(SafeFetch).to receive(:fetch).and_yield(logo_file)

    portal = described_class.new(account, admin).perform

    expect(SafeFetch).to have_received(:fetch)
      .with('https://cdn.example/logo.png', max_bytes: 5.megabytes, allowed_content_type_prefixes: ['image/'])
    expect(portal.logo.filename.to_s).to eq('logo.png')
  end

  it 'still creates the portal when the logo download fails' do
    allow(SafeFetch).to receive(:fetch).and_raise(SafeFetch::Error, 'too big')

    expect(described_class.new(account, admin).perform).to be_persisted
    expect(Rails.logger).to have_received(:error)
      .with("[HelpCenterCreation] Logo attachment failed for account #{account.id}: SafeFetch::Error - too big")
  end

  it 'still creates the portal when article generation cannot be queued' do
    account.update!(custom_attributes: { 'website' => 'acme.com' })
    allow(Onboarding::HelpCenterArticleGenerationJob).to receive(:perform_later).and_raise(RedisClient::CannotConnectError, 'down')

    expect(described_class.new(account, admin).perform).to be_persisted
    expect(Rails.logger).to have_received(:error)
      .with("[HelpCenterCreation] Failed to enqueue article generation for account #{account.id}: RedisClient::CannotConnectError - down")
  end

  it 'falls back to a random slug when the account name has no usable characters' do
    account.update!(name: '日本')
    allow(SecureRandom).to receive(:hex).with(4).and_return('a1b2c3d4')

    expect(described_class.new(account, admin).perform.slug).to eq('portal-a1b2c3d4')
  end
end
