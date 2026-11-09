require 'rails_helper'

# OneTeam coverage for the suspension history shown on super admin account
# pages.
RSpec.describe SuspensionHistoryField do
  let(:admin) { create(:user, name: 'Root Admin') }
  let(:event) { { 'category' => 'spam', 'suspended_at' => '2026-01-02T10:00:00Z', 'suspended_by' => admin.id } }
  let(:field) { described_class.new(:suspension_history, [event, { 'suspended_by' => 0 }], :show) }

  it 'labels the category and time' do
    expect(field.category_label(event)).to eq('Spam')
    expect(field.suspended_at(event)).to eq(I18n.l(Time.zone.parse('2026-01-02T10:00:00Z'), format: :long))
  end

  it 'names who suspended the account' do
    expect(field.suspended_by(event)).to eq('Root Admin')
    expect(field.suspended_by({ 'suspended_by' => 0 })).to eq(I18n.t('super_admin.account_suspension.history.unknown_user'))
  end
end
