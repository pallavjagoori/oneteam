require 'rails_helper'

# OneTeam coverage for suspending accounts from super admin: a suspension
# needs a known category and a reason of at most 256 characters, each new
# suspension is added to the account's history with who suspended it,
# editing a suspended account's reason updates the latest entry, and an
# account suspended before history existed gets its first entry when a
# reason is added. Also feature toggles and the seed, reset-cache and
# delete actions.
RSpec.describe 'Super Admin account suspensions', type: :request do
  let(:super_admin) { create(:super_admin) }
  let(:account) { create(:account) }

  before { sign_in(super_admin, scope: :super_admin) }

  def suspend(category: 'spam', reason: 'Sends spam')
    patch "/super_admin/accounts/#{account.id}",
          params: { account: { name: account.name, status: 'suspended', suspension_category: category, suspension_reason: reason } }
  end

  def history
    account.reload.suspension_history
  end

  it 'requires a known category and a short reason' do
    suspend(category: '', reason: '')
    expect(response).to have_http_status(:unprocessable_content)

    suspend(category: 'rude', reason: 'x' * 257)
    expect(response).to have_http_status(:unprocessable_content)
    expect(account.reload).to be_active
  end

  it 'records who suspended an active account and why' do
    freeze_time do
      suspend

      expect(account.reload).to be_suspended
      expect(history).to eq([{ 'category' => 'spam', 'reason' => 'Sends spam', 'suspended_at' => Time.current.iso8601,
                               'suspended_by' => super_admin.id }])
    end
  end

  it 'updates the latest entry when a suspended account’s reason changes' do
    suspend
    suspend(category: 'other', reason: 'Chargeback')

    expect(history.size).to eq(1)
    expect(history.last).to include('category' => 'other', 'reason' => 'Chargeback', 'suspended_by' => super_admin.id)
  end

  it 'adds a first entry for an account suspended before history existed' do
    account.update!(status: :suspended)

    suspend(category: 'non_payment', reason: 'Card declined')

    expect(history).to match([hash_including('category' => 'non_payment', 'reason' => 'Card declined')])
    expect(history.last).not_to have_key('suspended_by')
  end

  it 'lets other fields change on a legacy suspended account without a reason' do
    account.update!(status: :suspended)

    patch "/super_admin/accounts/#{account.id}", params: { account: { name: 'Renamed', status: 'suspended' } }

    expect(account.reload.name).to eq('Renamed')
    expect(history).to be_empty
  end

  it 'queues demo data seeding' do
    expect { post "/super_admin/accounts/#{account.id}/seed" }.to have_enqueued_job(Internal::SeedAccountJob).with(account)

    expect(response).to have_http_status(:redirect)
  end

  it 'turns on the features ticked in the form' do
    patch "/super_admin/accounts/#{account.id}", params: { account: { name: account.name }, enabled_features: { feature_help_center: '1' } }

    expect(account.reload.feature_enabled?('help_center')).to be(true)
  end

  it 'clears the account cache keys' do
    post "/super_admin/accounts/#{account.id}/reset_cache"

    expect(flash[:notice]).to eq('Cache keys cleared')
  end

  it 'queues the account for deletion' do
    expect { delete "/super_admin/accounts/#{account.id}" }.to have_enqueued_job(DeleteObjectJob).with(account)

    expect(flash[:notice]).to eq('Account deletion is in progress.')
  end
end
