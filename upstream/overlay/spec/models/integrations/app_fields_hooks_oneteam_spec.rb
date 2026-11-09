# frozen_string_literal: true

require 'rails_helper'

# OneTeam: an integration app exposes its fields and the current account's hooks.
RSpec.describe Integrations::App do
  it 'reads fields and the hooks of the current account' do
    account = create(:account)
    hook = create(:integrations_hook, account: account, app_id: 'webhook')
    Current.account = account
    app = described_class.new(id: 'webhook', fields: [{ name: 'url' }])

    expect(app.fields).to eq([{ name: 'url' }])
    expect(app.hooks).to contain_exactly(hook)
  ensure
    Current.reset
  end
end
