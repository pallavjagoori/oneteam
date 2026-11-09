require 'rails_helper'

# OneTeam coverage for the call details pushed with a missed call
# notification.
RSpec.describe Enterprise::Notification do
  let(:notification) { Notification.new }

  it 'pushes the call summary' do
    call = instance_double(Call, push_event_data: { id: 1, provider_call_id: 'CA1', provider: 'twilio', status: 'missed',
                                                    from_number: '+1555', extra: true })
    allow(notification).to receive(:secondary_actor).and_return(Struct.new(:call).new(call))

    expect(notification.send(:missed_call_push_data))
      .to eq(id: 1, provider_call_id: 'CA1', provider: 'twilio', status: 'missed', from_number: '+1555')
  end

  it 'pushes nothing without a call' do
    allow(notification).to receive(:secondary_actor).and_return(nil)

    expect(notification.send(:missed_call_push_data)).to be_nil
  end
end
