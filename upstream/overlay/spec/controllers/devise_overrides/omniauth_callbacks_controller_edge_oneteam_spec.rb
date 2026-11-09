require 'rails_helper'

# OneTeam coverage for OAuth sign-up when a pending Shopify installation
# cannot be claimed, and Google OAuth state that is not valid JSON.
RSpec.describe DeviseOverrides::OmniauthCallbacksController do
  let(:controller_instance) { described_class.allocate }

  it 'sends the user back to login when the Shopify installation fails' do
    allow(controller_instance).to receive_messages(account_signup_allowed?: true, validate_signup_email_is_business_domain?: true,
                                                   redirect_to: nil)
    allow(controller_instance).to receive(:login_page_url) { |**args| "/login?error=#{args[:error]}" }
    allow(controller_instance).to receive(:create_account_for_user).and_raise(Shopify::PendingInstallation::InvalidToken)

    controller_instance.send(:sign_up_user)

    expect(controller_instance).to have_received(:redirect_to).with('/login?error=shopify-installation-failed')
  end

  it 'ignores Google OAuth state that is not valid JSON' do
    expect(controller_instance.send(:parse_google_oauth_context, '{not json')).to eq({})
  end
end
