require 'rails_helper'

# OneTeam coverage for SAML accounts refusing to invite a user who already
# belongs to another account.
RSpec.describe Enterprise::AgentBuilder do
  it 'refuses a multi-account invitation on a SAML account' do
    account = create(:account)
    allow(account).to receive(:saml_enabled?).and_return(true)
    existing = create(:user, account: create(:account))

    expect { AgentBuilder.new(email: existing.email, name: 'Ann', inviter: create(:user, account: account), account: account).perform }
      .to raise_error(ActiveRecord::RecordInvalid, /#{Regexp.escape(I18n.t('errors.saml.multi_account_invitation_not_allowed'))}/)
  end
end
