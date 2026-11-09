require 'rails_helper'

# OneTeam coverage for the public tool base: running when no newer customer
# message arrived, its empty permissions, and usage logging.
RSpec.describe Captain::Tools::BasePublicTool do
  let(:tool_class) do
    Class.new(described_class) do
      def self.name = 'OneteamProbeTool'

      def perform(_tool_context, **)
        'ran'
      end
    end
  end
  let(:tool) { tool_class.new(Struct.new(:id).new(8)) }

  it 'runs the tool when no newer message arrived' do
    expect(tool.execute(Struct.new(:state).new({}))).to eq('ran')
  end

  it 'needs no permissions' do
    expect(tool.permissions).to eq([])
  end

  it 'logs tool usage' do
    allow(Rails.logger).to receive(:info).and_yield

    tool.send(:log_tool_usage, 'searched', query: 'refund')

    expect(Rails.logger).to have_received(:info)
  end
end
