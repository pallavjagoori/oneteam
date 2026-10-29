require 'rails_helper'

# OneTeam coverage for WhatsApp call status webhooks. Meta's `connect` for an
# outbound call fires before the contact picks up; the real pickup is a
# status webhook with ACCEPTED, which moves the call to in progress.
RSpec.describe Whatsapp::IncomingCallService do
  let(:account) { create(:account) }
  let(:channel) do
    create(:channel_whatsapp, provider: 'whatsapp_cloud', account: account, validate_provider_config: false, sync_templates: false)
  end
  let(:inbox) { channel.inbox }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:call) do
    create(:call, conversation: conversation, provider: :whatsapp, direction: :outgoing, status: 'ringing', provider_call_id: 'wacid_1')
  end

  before do
    account.enable_features!('channel_voice')
    channel.update!(provider_config: channel.provider_config.merge('source' => 'embedded_signup', 'calling_enabled' => true))
    allow(ActionCable.server).to receive(:broadcast)
  end

  def status(value, **extra)
    described_class.new(inbox: inbox, params: { statuses: [{ type: 'call', id: call.provider_call_id, status: value, **extra }] }).perform
  end

  it 'marks an outbound call in progress from the pickup time and tells the account' do
    status('ACCEPTED', timestamp: '1767225600')

    expect(call.reload).to have_attributes(status: 'in_progress', started_at: Time.zone.at(1_767_225_600))
    expect(conversation.reload.additional_attributes['call_status']).to be_present
    expect(ActionCable.server).to have_received(:broadcast)
      .with("account_#{account.id}", hash_including(event: 'voice_call.outbound_accepted'))
  end

  it 'uses the current time when Meta sends no timestamp' do
    freeze_time do
      status('ACCEPTED')

      expect(call.reload.started_at).to eq(Time.current)
    end
  end

  {
    'an incoming call' => { direction: :incoming },
    'a call already in progress' => { status: 'in_progress' },
    'a finished call' => { status: 'completed' }
  }.each do |case_name, attributes|
    it "leaves #{case_name} alone" do
      call.update!(attributes)

      expect { status('ACCEPTED') }.not_to(change { call.reload.attributes })
      expect(ActionCable.server).not_to have_received(:broadcast)
    end
  end

  it 'ignores ringing, unknown and non-call statuses, and unknown calls' do
    allow(Rails.logger).to receive(:info)

    status('RINGING')
    status('MISSED')
    described_class.new(inbox: inbox, params: { statuses: [{ type: 'message', id: call.provider_call_id, status: 'ACCEPTED' },
                                                           { type: 'call', id: 'unknown', status: 'ACCEPTED' }] }).perform

    expect(call.reload.status).to eq('ringing')
    expect(Rails.logger).to have_received(:info).with('[WHATSAPP CALL] Unhandled call status: MISSED for wacid_1')
  end
end
