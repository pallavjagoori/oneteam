require 'rails_helper'

# OneTeam coverage for tools listed in config/agents/tools.yml that have no
# class: they are left out with a warning.
RSpec.describe Concerns::CaptainToolsHelpers do
  it 'skips tools without a class' do
    host = Class.new { include Concerns::CaptainToolsHelpers }
    allow(YAML).to receive(:load_file).and_call_original
    allow(YAML).to receive(:load_file).with(Rails.root.join('config/agents/tools.yml')).and_return([{ 'id' => 'no_such_widget' }])
    allow(Rails.logger).to receive(:warn)

    expect(host.send(:load_agent_tools)).to eq([])
    expect(Rails.logger).to have_received(:warn).with('Tool class not found for ID: no_such_widget')
  end
end
