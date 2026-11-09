require 'rails_helper'

# OneTeam coverage for the Linear OAuth callback's redirect fallback: when the
# signed state names an account that no longer exists, the user is sent to the
# app's base URL instead of a broken settings link.
RSpec.describe Linear::CallbacksController do
  it 'falls back to the base url when the account cannot be found' do
    controller = described_class.new
    allow(controller).to receive(:account_id).and_return(0)

    expect(controller.send(:safe_linear_redirect_uri)).to eq(controller.send(:base_url))
  end
end
