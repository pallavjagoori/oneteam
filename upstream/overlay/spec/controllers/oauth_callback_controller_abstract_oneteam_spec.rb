require 'rails_helper'

# OneTeam coverage for the OAuth callback base controller: the methods each
# provider must define, and a state signed for the onboarding flow.
RSpec.describe OauthCallbackController do
  let(:controller_instance) { described_class.allocate }

  it 'asks providers to name themselves and build their client' do
    expect { controller_instance.send(:provider_name) }.to raise_error(NotImplementedError)
    expect { controller_instance.send(:oauth_client) }.to raise_error(NotImplementedError)
  end

  it 'returns to onboarding for a state signed for onboarding' do
    account = create(:account)
    state = account.to_sgid(expires_in: 15.minutes, for: 'onboarding').to_s
    allow(controller_instance).to receive(:params).and_return(ActionController::Parameters.new(state: state))

    expect(controller_instance.send(:account_from_signed_id)).to eq(account)
    expect(controller_instance.instance_variable_get(:@return_to)).to eq('onboarding')
  end
end
