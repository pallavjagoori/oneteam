require 'rails_helper'

# OneTeam coverage for an Android VoIP push that raises: it counts as failed.
RSpec.describe Voice::FcmVoipSender do
  it 'marks the push as failed' do
    client = Class.new do
      def send_v1(**)
        raise 'firebase down'
      end
    end.new
    allow(Rails.logger).to receive(:error)

    outcome = described_class.new(client: client, call_id: 7, expiry_seconds: 30).send(:deliver_one, 'token-123456789', {}, 'ring')

    expect(outcome).to eq(:failed)
    expect(Rails.logger).to have_received(:error).with(/android ring call 7 to token-12… failed: RuntimeError: firebase down/)
  end
end
