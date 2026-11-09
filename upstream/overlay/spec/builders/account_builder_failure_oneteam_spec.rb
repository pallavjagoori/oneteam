require 'rails_helper'

# OneTeam coverage for account sign-ups that fail while creating the
# account: the error is logged and raised again.
describe AccountBuilder do
  it 're-raises errors from account creation' do
    allow(Account).to receive(:create!).and_raise(ActiveRecord::RecordInvalid.new(Account.new))
    allow(Account::SignUpEmailValidationService).to receive(:new).and_return(instance_double(Account::SignUpEmailValidationService, perform: true))

    expect { described_class.new(email: 'new-owner@example.com', account_name: 'Acme', user_password: 'Password1!').perform }
      .to raise_error(ActiveRecord::RecordInvalid)
  end
end
