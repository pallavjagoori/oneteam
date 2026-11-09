# frozen_string_literal: true

require 'rails_helper'

# OneTeam: account and call errors carry their messages and status.
RSpec.describe CustomExceptions::Account::UserErrors do
  it 'joins the record errors' do
    errors = Struct.new(:full_messages).new(['Email is invalid', 'Name is blank'])

    expect(described_class.new({ errors: errors }).message).to eq('Email is invalid,Name is blank')
  end

  it 'explains a required plan upgrade' do
    expect(CustomExceptions::Account::PlanUpgradeRequired.new({}).message).to eq(I18n.t('errors.plan_upgrade_required.failed'))
  end

  it 'names the agent who already took the call, with a conflict status' do
    error = CustomExceptions::CallAlreadyAccepted.new({ agent_name: 'Jane' })

    expect(error.message).to eq(I18n.t('errors.voice.call_already_accepted', agent_name: 'Jane'))
    expect(error.http_status).to eq(409)
  end
end
