require 'rails_helper'

RSpec.describe Api::V1::Accounts::Captain::ToolsManifestsController do
  it 'forbids access when custom tools are disabled for the account' do
    controller_instance = described_class.new
    allow(controller_instance).to receive(:render)
    Current.account = create(:account)

    controller_instance.send(:ensure_custom_tools_enabled)

    expect(controller_instance).to have_received(:render)
      .with(json: { error: 'Custom tools are not enabled for this account' }, status: :forbidden)
  ensure
    Current.reset
  end
end
