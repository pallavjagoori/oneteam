require 'rails_helper'

# OneTeam coverage for Captain's label and priority suggestions on a
# conversation. They need the captain_classifier feature, and on enterprise
# a spent monthly or daily AI quota answers 429 with Retry-After.
RSpec.describe 'Conversation suggestions API', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:conversation) { create(:conversation, account: account) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}/suggestions" }
  let(:classifier) { instance_double(Captain::ConversationClassifierService) }

  before do
    account.enable_features!('captain_classifier')
    allow(Captain::ConversationClassifierService).to receive(:new).with(conversation: conversation).and_return(classifier)
  end

  it 'suggests labels' do
    allow(classifier).to receive(:labels).and_return(%w[billing refund])

    get "#{base_url}/labels", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq('labels' => %w[billing refund])
  end

  it 'suggests a priority' do
    allow(classifier).to receive(:priority).and_return({ priority: 'high', reason: 'Payment failed' })

    get "#{base_url}/priority", headers: admin.create_new_auth_token, as: :json

    expect(response.parsed_body).to eq('priority' => 'high', 'reason' => 'Payment failed')
  end

  it 'is unauthorized when the feature is off' do
    account.disable_features!('captain_classifier')

    get "#{base_url}/labels", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'answers 429 with Retry-After when the AI quota is spent', if: ChatwootApp.enterprise? do
    allow(classifier).to receive(:labels).and_raise(CustomExceptions::JevQuotaError.new('monthly_limit', retry_after: 3600))

    get "#{base_url}/labels", headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:too_many_requests)
    expect(response.headers['Retry-After']).to eq('3600')
    expect(response.parsed_body).to eq('error' => 'monthly_limit', 'retry_after' => 3600)
  end
end
