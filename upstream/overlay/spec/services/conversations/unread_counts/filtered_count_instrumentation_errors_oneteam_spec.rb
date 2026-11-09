require 'rails_helper'

# OneTeam coverage for New Relic calls that fail: instrumentation never
# breaks the request.
RSpec.describe Conversations::UnreadCounts::FilteredCountInstrumentation do
  let(:agent) do
    Class.new do
      def record_custom_event(*)
        raise 'agent down'
      end

      def record_metric(*)
        raise 'agent down'
      end
    end.new
  end

  before { allow(described_class).to receive(:new_relic_agent).and_return(agent) }

  it 'swallows custom event errors' do
    expect(described_class.record_event(:snapshot_state, status: :fresh)).to be_nil
  end

  it 'swallows metric errors' do
    expect(described_class.send(:record_metric, 'Custom/x', 1)).to be_nil
  end
end
