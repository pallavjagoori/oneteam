require 'rails_helper'

RSpec.describe SuperAdmin::UserDiagnosticsController do
  it 'redirects back with an alert when no subscriptions were selected' do
    user = create(:user)
    controller_instance = described_class.new
    allow(controller_instance).to receive_messages(params: ActionController::Parameters.new(user_id: user.id), parsed_subscription_ids: [])
    allow(controller_instance).to receive(:super_admin_user_diagnostics_path) { |**options| "/diagnostics?#{options.to_query}" }
    allow(controller_instance).to receive(:redirect_to)

    controller_instance.destroy_subscriptions

    expect(controller_instance).to have_received(:redirect_to)
      .with("/diagnostics?#{{ tab: 'push', user_query: user.id }.to_query}",
            alert: I18n.t('super_admin.user_diagnostics.push.no_subscriptions_to_delete'))
  end
end
