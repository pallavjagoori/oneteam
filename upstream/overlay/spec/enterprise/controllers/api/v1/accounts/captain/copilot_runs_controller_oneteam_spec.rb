require 'rails_helper'

# OneTeam coverage for the approval card's buttons. Only the agent who asked
# Copilot for a change can approve or reject it; a decided or expired change
# answers 422 with the saved card, and approving after workflows were
# turned off rejects the change instead.
RSpec.describe 'Copilot runs API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:turn) { start_copilot_turn(account: account, user: admin) }
  let(:action) { copilot_label_action(turn, [create(:conversation, account: account).id]) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/captain/copilot_runs/#{action.id}" }

  before do
    account.enable_features!('copilot_workflows')
    create(:label, account: account, title: 'refund')
  end

  it 'approves the change and returns the updated card' do
    post "#{base_url}/approve", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body['message']['approval']['status']).to eq('approved')
    expect(Captain::Copilot::ActionJob).to have_been_enqueued.with(action.id)
  end

  it 'rejects the change' do
    post "#{base_url}/reject", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(action.reload.context['decision_reason']).to eq(I18n.t('captain.copilot.approval_rejected'))
  end

  it 'answers 422 with the card once decided' do
    action.reject('No')

    post "#{base_url}/reject", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to eq(I18n.t('captain.copilot.approval_already_decided'))
    expect(response.parsed_body['message']['message']['approval']['status']).to eq('rejected')
  end

  it 'explains an expired change' do
    action.update_column(:created_at, 10.minutes.ago) # rubocop:disable Rails/SkipsModelValidations

    post "#{base_url}/approve", headers: admin.create_new_auth_token, as: :json

    expect(response.parsed_body['error']).to eq(I18n.t('captain.copilot.approval_expired_notice'))
  end

  it 'rejects instead of approving when workflows were turned off' do
    action
    account.disable_features!('copilot_workflows')

    post "#{base_url}/approve", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to eq(I18n.t('captain.copilot_workflows_disabled'))
    expect(action.reload).to be_rejected
  end

  it 'is not found for another agent' do
    other = create(:user, account: account, role: :administrator)

    post "#{base_url}/approve", headers: other.create_new_auth_token, as: :json

    expect(response).to have_http_status(:not_found)
  end
end
