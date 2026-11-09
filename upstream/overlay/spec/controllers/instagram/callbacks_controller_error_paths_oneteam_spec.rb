require 'rails_helper'

RSpec.describe Instagram::CallbacksController do
  let(:controller_instance) { described_class.new }

  before do
    allow(controller_instance).to receive(:params).and_return(ActionController::Parameters.new({}))
    allow(controller_instance).to receive(:redirect_to_error_page)
  end

  it 'redirects with a payment required error when the inbox limit is reached' do
    allow(controller_instance).to receive(:process_successful_authorization)
      .and_raise(CustomExceptions::Inbox::LimitExceeded.new({}))

    controller_instance.show

    expect(controller_instance).to have_received(:redirect_to_error_page).with(
      'error_type' => 'CustomExceptions::Inbox::LimitExceeded', 'code' => 402,
      'error_message' => 'Account limit exceeded. Upgrade to a higher plan'
    )
  end

  it 'loads the account from the state token' do
    account = create(:account)
    allow(controller_instance).to receive(:account_id).and_return(account.id)

    expect(controller_instance.send(:account)).to eq(account)
  end
end
