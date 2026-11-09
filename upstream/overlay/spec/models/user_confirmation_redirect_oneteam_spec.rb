require 'rails_helper'

# OneTeam coverage for confirmation emails that carry a redirect URL.
RSpec.describe User do
  it 'sends the confirmation with the redirect URL and then forgets it' do
    user = create(:user, skip_confirmation: false)
    allow(user).to receive(:send_confirmation_instructions) do
      expect(user.instance_variable_get(:@confirmation_redirect_url)).to eq('https://app.example/next')
    end

    user.send_confirmation_instructions_with_redirect(redirect_url: 'https://app.example/next')

    expect(user).to have_received(:send_confirmation_instructions)
    expect(user.instance_variable_get(:@confirmation_redirect_url)).to be_nil
  end
end
