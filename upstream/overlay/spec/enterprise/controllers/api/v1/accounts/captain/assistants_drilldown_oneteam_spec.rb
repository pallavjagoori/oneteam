require 'rails_helper'

# OneTeam coverage for the assistant stat card drilldowns (the conversations
# behind "handled", "auto-resolved", "handed off" and "reopened"), plus the
# metrics and tools endpoints. A bot resolve on a conversation that was also
# handed off does not count as auto-resolved, matching the stat card.
RSpec.describe 'Captain assistant drilldown API', type: :request do
  let(:account) { create(:account) }
  let!(:auto) { handled_conversation.tap { |conversation| event(conversation, 'conversation_captain_inference_resolved') } }
  let!(:handed_off) { handled_conversation.tap { |conversation| event(conversation, 'conversation_captain_inference_handoff') } }
  let!(:bot_resolved_after_handoff) do
    handled_conversation.tap do |conversation|
      event(conversation, 'conversation_bot_handoff')
      event(conversation, 'conversation_bot_resolved')
    end
  end
  let!(:reopened) do
    handled_conversation.tap do |conversation|
      event(conversation, 'conversation_captain_inference_resolved', at: 2.days.ago)
      event(conversation, 'conversation_opened', at: 1.day.ago, value: 3600)
    end
  end
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:assistant) { create(:captain_assistant, account: account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:base_url) { "/api/v1/accounts/#{account.id}/captain/assistants" }

  def handled_conversation(at: 2.days.ago)
    create(:conversation, account: account, inbox: inbox).tap do |conversation|
      create(:message, account: account, inbox: inbox, conversation: conversation, sender: assistant, message_type: :outgoing,
                       created_at: at)
    end
  end

  def event(conversation, name, at: 1.day.ago, **attributes)
    create(:reporting_event, account: account, inbox: inbox, conversation: conversation, name: name, created_at: at,
                             event_end_time: at, **attributes)
  end

  before { handled_conversation(at: 60.days.ago) }

  def drilldown(metric, **params)
    get "#{base_url}/#{assistant.id}/drilldown", params: { metric: metric, range: '30' }.merge(params), headers: admin.create_new_auth_token
    response.parsed_body
  end

  def conversation_ids(metric)
    drilldown(metric)['payload'].map { |row| row.dig('conversation', 'id') || row['id'] }
  end

  it 'lists the conversations behind each stat card, newest first' do
    expect(conversation_ids('conversations_handled')).to eq([reopened, bot_resolved_after_handoff, handed_off, auto].map(&:id))
    expect(conversation_ids('auto_resolution_rate')).to eq([reopened, auto].map(&:id))
    expect(conversation_ids('handoff_rate')).to eq([bot_resolved_after_handoff, handed_off].map(&:id))
    expect(conversation_ids('reopen_rate')).to eq([reopened.id])
  end

  it 'describes the page and the window' do
    meta = drilldown('conversations_handled', page: 2, per_page: 3)['meta']

    expect(meta).to include('metric' => 'conversations_handled', 'current_page' => 2, 'per_page' => 3, 'total_count' => 4)
    expect(meta['range']['until'] - meta['range']['since']).to be_within(5).of(30.days.to_i)
  end

  it 'rejects an unknown metric' do
    get "#{base_url}/#{assistant.id}/drilldown", params: { metric: 'csat' }, headers: admin.create_new_auth_token

    expect(response).to have_http_status(:unprocessable_content)
  end

  it 'returns the stat card metrics' do
    allow(Captain::AssistantStatsBuilder).to receive(:new).and_return(instance_double(Captain::AssistantStatsBuilder, metrics: { handled: 4 }))

    get "#{base_url}/#{assistant.id}/metrics", params: { range: '7', timezone_offset: '1' }, headers: admin.create_new_auth_token

    expect(response.parsed_body).to eq('handled' => 4)
    expect(Captain::AssistantStatsBuilder).to have_received(:new).with(assistant, '7', '1')
  end

  it 'lists the tools the assistant can use' do
    get "#{base_url}/tools", params: { assistant_id: assistant.id }, headers: admin.create_new_auth_token

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.pluck('id')).to include(*assistant.available_agent_tools.pluck(:id))
  end
end
