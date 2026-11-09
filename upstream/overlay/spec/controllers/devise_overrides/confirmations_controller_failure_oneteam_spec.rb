require 'rails_helper'

# OneTeam coverage for confirmations that fail for another reason than a bad
# or used token, and the password reset link helper.
RSpec.describe DeviseOverrides::ConfirmationsController do
  let(:controller_instance) { described_class.allocate }

  it 'reports a generic failure' do
    allow(controller_instance).to receive(:render)
    controller_instance.instance_variable_set(:@confirmable, instance_double(User, blank?: false, confirmed_at: nil))

    controller_instance.send(:render_confirmation_error)

    expect(controller_instance).to have_received(:render).with(json: { message: 'Failure', redirect_url: '/' }, status: :unprocessable_entity)
  end

  it 'builds a password reset link' do
    user = instance_double(User)
    allow(user).to receive(:send).with(:set_reset_password_token).and_return('tok123')

    expect(controller_instance.send(:create_reset_token_link, user))
      .to eq('/app/auth/password/edit?config=default&redirect_url=&reset_password_token=tok123')
  end
end
