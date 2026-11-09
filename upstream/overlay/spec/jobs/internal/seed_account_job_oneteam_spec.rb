require 'rails_helper'

# OneTeam coverage: the super admin "seed account" job runs the account seeder.
RSpec.describe Internal::SeedAccountJob do
  it 'seeds the account' do
    account = create(:account)
    seeder = instance_double(Seeders::AccountSeeder, perform!: true)
    allow(Seeders::AccountSeeder).to receive(:new).with(account: account).and_return(seeder)

    described_class.perform_now(account)

    expect(seeder).to have_received(:perform!)
  end
end
