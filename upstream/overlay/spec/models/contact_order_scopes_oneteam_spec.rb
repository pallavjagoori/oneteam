require 'rails_helper'

# OneTeam coverage for contact list sorting by creation date, city and name.
RSpec.describe Contact do
  let(:account) { create(:account) }
  let!(:early) { create(:contact, account: account, name: 'Zed', additional_attributes: { city: 'Austin' }, created_at: 2.days.ago) }
  let!(:late) { create(:contact, account: account, name: 'Amy', additional_attributes: { city: 'Boston' }, created_at: 1.day.ago) }

  it 'sorts by creation date' do
    expect(account.contacts.order_on_created_at('desc').to_a).to eq([late, early])
  end

  it 'sorts by city' do
    expect(account.contacts.order_on_city('asc').to_a).to eq([early, late])
  end

  it 'sorts by name' do
    expect(account.contacts.order_on_name('asc').to_a).to eq([late, early])
  end
end
