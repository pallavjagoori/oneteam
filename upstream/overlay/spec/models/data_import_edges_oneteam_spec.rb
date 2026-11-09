require 'rails_helper'

# OneTeam coverage for data import helpers: Freshdesk detection, which
# imports can be abandoned, and unsupported import types.
RSpec.describe DataImport do
  let(:intercom) { build(:data_import, :intercom) }

  it 'tells Freshdesk imports apart' do
    expect(intercom.freshdesk_import?).to be(false)
    expect(build(:data_import, data_type: 'freshdesk', source_provider: 'freshdesk').freshdesk_import?).to be(true)
  end

  it 'lets pending integration imports be abandoned' do
    intercom.status = :pending

    expect(intercom.abandonable?).to be(true)
  end

  it 'rejects unsupported import types' do
    intercom.import_types = %w[contacts invoices]

    expect(intercom).not_to be_valid
    expect(intercom.errors[:import_types].join).to include('contains unsupported values: invoices')
  end
end
