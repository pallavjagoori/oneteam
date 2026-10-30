require 'rails_helper'

# OneTeam coverage for the Twilio conference events Chatwoot's specs leave
# out: conference start and end, and assigning the conversation to the first
# agent who joins. Twilio is not called; the conference service is stubbed.
RSpec.describe Voice::Conference::Manager do
  let(:account) { create(:account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:channel) { create(:channel_twilio_sms, :with_voice, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: channel.inbox) }
  let(:call) { create(:call, conversation: conversation, status: 'ringing') }
  let(:conference) { instance_double(Voice::Provider::Twilio::ConferenceService, remember_claim_assignment: true) }

  before do
    allow(Twilio::VoiceWebhookSetupService).to receive(:new)
      .and_return(instance_double(Twilio::VoiceWebhookSetupService, perform: 'AP1'))
    allow(Voice::Provider::Twilio::ConferenceService).to receive(:new).and_return(conference)
    create(:inbox_member, inbox: channel.inbox, user: agent)
  end

  def event(name, **)
    described_class.new(call: call, event: name, **).process
  end

  it 'keeps a ringing call ringing when the conference starts, and ignores a late start' do
    event('start')
    expect(call.reload.status).to eq('ringing')

    call.update!(status: 'in_progress')
    event('start')
    expect(call.reload.status).to eq('in_progress')
  end

  it 'completes the call when the conference ends, but leaves a finished call alone' do
    call.update!(status: 'in_progress', started_at: 1.minute.ago)
    event('end')
    expect(call.reload.status).to eq('completed')

    call.update!(status: 'no_answer')
    event('end')
    expect(call.reload.status).to eq('no_answer')
  end

  it 'assigns an unassigned conversation to the first agent who joins' do
    event('join', participant_label: "agent-#{agent.id}-account-#{account.id}", participant_call_sid: 'CA-agent')

    expect(conversation.reload.assignee).to eq(agent)
    expect(conference).to have_received(:remember_claim_assignment).with(agent.id)
  end

  it 'keeps an existing assignee' do
    other = create(:user, account: account, role: :agent)
    conversation.update!(assignee: other)

    event('join', participant_label: "agent-#{agent.id}-account-#{account.id}", participant_call_sid: 'CA-agent')

    expect(conversation.reload.assignee).to eq(other)
    expect(conference).not_to have_received(:remember_claim_assignment)
  end
end
