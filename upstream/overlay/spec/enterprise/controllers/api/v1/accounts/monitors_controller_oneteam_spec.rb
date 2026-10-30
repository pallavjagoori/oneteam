require 'rails_helper'

# OneTeam coverage for retrying a monitor's failed evaluations (only while
# it is collecting) and for previewing an empty condition.
RSpec.describe 'Monitors API retries and previews', type: :request do
  let(:account) { create(:account) }
  let(:headers) { create(:user, account: account, role: :administrator).create_new_auth_token }
  let(:monitor) { create(:conversation_monitor, account: account) }
  let(:base) { "/api/v1/accounts/#{account.id}/monitors" }

  before do
    account.enable_features!('reports', 'conversation_monitors')
    InstallationConfig.find_or_initialize_by(name: 'CAPTAIN_OPENROUTER_API_KEY').update!(value: 'test-key')
  end

  def retry_evaluations
    post "#{base}/#{monitor.id}/retry_evaluations", headers: headers, as: :json
  end

  it 'queues a retry for a collecting monitor' do
    expect { retry_evaluations }.to have_enqueued_job(ConversationMonitors::RetryJob).with(monitor.id)

    expect(response).to have_http_status(:accepted)
  end

  it 'refuses a retry once the monitor stops collecting' do
    allow_any_instance_of(ConversationMonitors::Monitor).to receive(:collecting?).and_return(false) # rubocop:disable RSpec/AnyInstance

    retry_evaluations

    expect(response.parsed_body).to eq('error' => 'monitor_changed')
  end

  it 'refuses to preview an empty condition' do
    post "#{base}/preview", headers: headers, params: { condition: '   ' }, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body).to eq('error' => 'invalid_parameters')
  end
end
