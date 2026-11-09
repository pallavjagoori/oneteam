require 'rails_helper'

# OneTeam coverage for user diagnostics labels: why call pushes are off, and
# web push endpoints that are not valid URLs.
RSpec.describe SuperAdmin::UserDiagnosticsHelper, type: :helper do
  it 'explains that call pushes need voice and mobile calls enabled' do
    expect(helper.unavailable_reason(:voice_call_missed)).to eq(I18n.t('super_admin.user_diagnostics.push_settings.calls_unavailable'))
  end

  it 'shows the raw endpoint when it cannot be parsed' do
    subscription = build(:notification_subscription, subscription_type: :browser_push,
                                                     subscription_attributes: { endpoint: 'https://bad host/push' })

    expect(helper.device_identifier(subscription)).to eq('https://bad host/push')
  end
end
