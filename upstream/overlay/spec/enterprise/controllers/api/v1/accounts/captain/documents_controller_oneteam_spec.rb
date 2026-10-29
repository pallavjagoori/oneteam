require 'rails_helper'

# OneTeam coverage for the Captain documents list filters: by source (web
# pages or PDFs), by sync state (stale, up to date, syncing, failed, judged
# against the plan's auto-sync interval), by name or link search, and the
# newest-first sort. Also a duplicate link on create.
RSpec.describe 'Captain documents list filters', type: :request do
  let(:account) { create(:account) }
  let!(:stale) { document('https://docs.example/stale', sync_status: :synced, last_synced_at: 3.days.ago) }
  let!(:fresh) { document('https://docs.example/fresh', name: 'Pricing guide', sync_status: :synced, last_synced_at: 1.hour.ago) }
  let!(:syncing) { document('https://docs.example/syncing', sync_status: :syncing, last_sync_attempted_at: 5.minutes.ago) }
  let!(:failed) { document('https://docs.example/failed', sync_status: :failed) }
  let!(:pdf) do
    create(:captain_document, account: account, assistant: assistant, external_link: nil, name: 'Manual',
                              pdf_file: Rack::Test::UploadedFile.new(Rails.root.join('spec/assets/sample.pdf'), 'application/pdf'))
  end
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:assistant) { create(:captain_assistant, account: account) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/captain/documents" }

  def document(link, name: link, **sync)
    create(:captain_document, account: account, assistant: assistant, external_link: link, name: name).tap do |document|
      document.update_columns(sync) if sync.present? # rubocop:disable Rails/SkipsModelValidations
    end
  end

  def listed_ids(**params)
    get base_url, params: params, headers: admin.create_new_auth_token
    response.parsed_body['payload'].pluck('id')
  end

  context 'when the plan auto-syncs every 24 hours' do
    before do
      create(:installation_config, name: 'CAPTAIN_DOCUMENT_AUTO_SYNC_INTERVALS', value: { 'Business' => 24 })
      account.update!(custom_attributes: { plan_name: 'Business' })
    end

    it 'filters by sync state and reports the interval' do
      expect(listed_ids(filter: 'stale')).to eq([stale.id])
      expect(response.parsed_body['meta']).to include('sync_interval_hours' => 24)
      expect(listed_ids(filter: 'synced')).to contain_exactly(fresh.id)
      expect(listed_ids(filter: 'syncing')).to eq([syncing.id])
      expect(listed_ids(filter: 'failed')).to eq([failed.id])
    end
  end

  context 'without an auto-sync interval' do
    it 'has no stale documents and counts every synced one as up to date' do
      expect(listed_ids(filter: 'stale')).to be_empty
      expect(listed_ids(filter: 'synced')).to contain_exactly(stale.id, fresh.id)
    end
  end

  it 'filters by source' do
    expect(listed_ids(source: 'pdf')).to eq([pdf.id])
    expect(listed_ids(source: 'web')).to contain_exactly(stale.id, fresh.id, syncing.id, failed.id)
  end

  it 'searches names and links' do
    expect(listed_ids(search_key: 'pricing')).to eq([fresh.id])
    expect(listed_ids(search_key: 'manual')).to eq([pdf.id])
  end

  it 'sorts by creation time, newest first' do
    expect(listed_ids(sort: 'recently_created')).to eq([pdf, failed, syncing, fresh, stale].map(&:id))
  end

  it 'rejects a link the assistant already has' do
    post base_url, params: { document: { assistant_id: assistant.id, external_link: 'https://docs.example/fresh' } },
                   headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to include('External link has already been taken')
  end
end
