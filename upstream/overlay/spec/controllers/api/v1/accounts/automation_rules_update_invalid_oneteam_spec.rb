require 'rails_helper'

RSpec.describe 'Automation rule update with invalid conditions', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }

  it 'rolls back and answers 422 when the saved rule is invalid' do
    rule = create(:automation_rule, account: account, name: 'Original')
    conditions = [{ attribute_key: 'not_a_real_attribute', filter_operator: 'equal_to', values: ['x'], query_operator: nil }]

    patch "/api/v1/accounts/#{account.id}/automation_rules/#{rule.id}",
          params: { name: 'Changed', conditions: conditions }, headers: admin.create_new_auth_token, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(rule.reload.name).to eq('Original')
  end
end
