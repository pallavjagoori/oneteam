require 'rails_helper'

RSpec.describe EnsureCurrentAccountHelper do
  it 'rejects requests that are neither from a user nor an agent bot' do
    account = create(:account)
    controller_instance = Api::V1::Accounts::BaseController.new
    allow(controller_instance).to receive_messages(params: ActionController::Parameters.new(account_id: account.id), current_user: nil)
    allow(controller_instance).to receive(:render_unauthorized)

    expect(controller_instance.send(:ensure_current_account)).to eq(account)
    expect(controller_instance).to have_received(:render_unauthorized).with(I18n.t('errors.account.not_authorized'))
  end
end
