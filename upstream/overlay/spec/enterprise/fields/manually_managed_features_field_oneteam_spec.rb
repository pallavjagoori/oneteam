require 'rails_helper'

# OneTeam coverage for the Super Admin field listing the features an
# operator turned on by hand for a cloud account, outside its billing plan.
RSpec.describe ManuallyManagedFeaturesField do
  let(:account) { create(:account) }

  def field(resource = account)
    described_class.new(:manually_managed_features, nil, :show, resource: resource)
  end

  it 'reads the features from the account’s internal attributes' do
    account.update!(internal_attributes: { 'manually_managed_features' => %w[sla custom_roles] })

    expect(field.data).to eq(%w[sla custom_roles])
    expect(field.selected_features).to eq(%w[sla custom_roles])
    expect(field.to_s).to eq('sla, custom_roles')
  end

  it 'offers every Business and Enterprise plan feature' do
    expect(field.all_features).to eq(Enterprise::Billing::HandleStripeEventService::BUSINESS_PLAN_FEATURES +
                                     Enterprise::Billing::HandleStripeEventService::ENTERPRISE_PLAN_FEATURES)
  end

  context 'when the stored value is not a list' do
    let(:service) { instance_double(Internal::Accounts::InternalAttributesService, manually_managed_features: 'sla') }

    before { allow(Internal::Accounts::InternalAttributesService).to receive(:new).and_return(service) }

    it 'shows an empty list and selects what the service returns' do
      expect(field.to_s).to eq('[]')
      expect(field.selected_features).to eq('sla')
    end

    it 'selects nothing for a resource without internal attributes' do
      expect(field(Object.new).selected_features).to eq([])
    end
  end
end
