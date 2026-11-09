# frozen_string_literal: true

require 'rails_helper'

# OneTeam: agents see no data imports.
RSpec.describe DataImportPolicy::Scope do
  it 'resolves to nothing for an agent' do
    account = create(:account)
    agent = create(:user, account: account, role: :agent)
    create(:data_import, account: account)
    context = { user: agent, account: account, account_user: agent.account_users.first }

    expect(described_class.new(context, DataImport).resolve).to be_empty
  end
end
