require 'rails_helper'

# OneTeam coverage for custom tool edge paths: the per-assistant limit, a
# test request that raises, and accounts without the feature.
RSpec.describe Api::V1::Accounts::Captain::CustomToolsController do
  let(:controller_instance) { described_class.allocate }
  let(:account) { create(:account) }
  let(:tools) { instance_double(ActiveRecord::Associations::CollectionProxy) }

  before do
    Current.account = account
    allow(controller_instance).to receive_messages(assistant_custom_tools: tools, custom_tool_params: {})
    allow(controller_instance).to receive(:render)
  end

  after { Current.reset }

  it 'reports the custom tool limit' do
    allow(tools).to receive(:create!).and_raise(Captain::CustomTool::LimitExceededError, 'Limit reached')
    allow(controller_instance).to receive(:render_could_not_create_error)

    controller_instance.create

    expect(controller_instance).to have_received(:render_could_not_create_error).with('Limit reached')
  end

  it 'answers 422 when the test request raises' do
    allow(tools).to receive(:new).and_raise(StandardError, 'bad url')

    controller_instance.test

    expect(controller_instance).to have_received(:render).with(json: { error: 'bad url' }, status: :unprocessable_content)
  end

  it 'answers 403 when custom tools are off' do
    controller_instance.send(:ensure_custom_tools_enabled)

    expect(controller_instance).to have_received(:render)
      .with(json: { error: 'Custom tools are not enabled for this account' }, status: :forbidden)
  end
end
