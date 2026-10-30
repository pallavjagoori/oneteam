require 'rails_helper'

# OneTeam coverage for the Captain writing tasks agents run from the reply
# box: rewrite a draft, summarize a conversation, suggest a reply, and refine
# a result with a follow-up message. The LLM services are doubles; these
# examples pin how each request maps to a service and how results render.
RSpec.describe 'Captain tasks API', type: :request do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/captain/tasks" }
  let(:headers) { agent.create_new_auth_token }

  def stub_service(klass, result)
    service = instance_double(klass, perform: result)
    allow(klass).to receive(:new).and_return(service)
    service
  end

  it 'rewrites content with the chosen operation' do
    stub_service(Captain::RewriteService, { message: 'Hello there!' })

    post "#{base_url}/rewrite", params: { content: 'hi', operation: 'friendly', conversation_display_id: 7 }, headers: headers, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq('message' => 'Hello there!')
    expect(Captain::RewriteService).to have_received(:new)
      .with(account: account, content: 'hi', operation: 'friendly', conversation_display_id: 7)
  end

  it 'summarizes a conversation' do
    stub_service(Captain::SummaryService, { message: 'Customer wants a refund.' })

    post "#{base_url}/summarize", params: { conversation_display_id: 7 }, headers: headers, as: :json

    expect(response.parsed_body).to eq('message' => 'Customer wants a refund.')
    expect(Captain::SummaryService).to have_received(:new).with(account: account, conversation_display_id: 7)
  end

  it 'suggests a reply as the current agent' do
    stub_service(Captain::ReplySuggestionService, { message: 'Sure, I can help.' })

    post "#{base_url}/reply_suggestion", params: { conversation_display_id: 7 }, headers: headers, as: :json

    expect(response.parsed_body).to eq('message' => 'Sure, I can help.')
    expect(Captain::ReplySuggestionService).to have_received(:new).with(account: account, conversation_display_id: 7, user: agent)
  end

  it 'returns the follow-up context along with the refined message' do
    context = { 'original' => 'hi', 'history' => [] }
    stub_service(Captain::FollowUpService, { message: 'Shorter', follow_up_context: context })

    post "#{base_url}/follow_up", params: { follow_up_context: context, message: 'shorter', conversation_display_id: 7 }, headers: headers, as: :json

    expect(response.parsed_body).to eq('message' => 'Shorter', 'follow_up_context' => context)
    expect(Captain::FollowUpService).to have_received(:new)
      .with(account: account, follow_up_context: context, user_message: 'shorter', conversation_display_id: 7)
  end

  it 'accepts a follow-up without context' do
    stub_service(Captain::FollowUpService, { message: 'Done' })

    post "#{base_url}/follow_up", params: { message: 'again' }, headers: headers, as: :json

    expect(response.parsed_body).to eq('message' => 'Done')
    expect(Captain::FollowUpService).to have_received(:new).with(hash_including(follow_up_context: nil))
  end

  it 'returns a null message when the service has nothing to say' do
    stub_service(Captain::SummaryService, nil)

    post "#{base_url}/summarize", params: { conversation_display_id: 7 }, headers: headers, as: :json

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq('message' => nil)
  end

  it 'returns a service error as 422' do
    stub_service(Captain::RewriteService, { error: 'Captain is not enabled' })

    post "#{base_url}/rewrite", params: { content: 'hi', operation: 'fix_spelling_grammar' }, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body).to eq('error' => 'Captain is not enabled')
  end

  it 'requires a signed-in user' do
    post "#{base_url}/summarize", params: { conversation_display_id: 7 }, as: :json

    expect(response).to have_http_status(:unauthorized)
  end
end
