# Contract test fixtures for Chatwoot.
#
# Creates the known starting state every contract test relies on: one account
# with a confirmed administrator and a confirmed agent. OneTeam ships an
# equivalent seeder, so both apps start from the same data. Safe to run twice.

PASSWORD = 'Contract-Pass-1!'.freeze

# Same installation config a production install loads in db/seeds.rb, without
# the development demo data that file adds outside production.
GlobalConfig.clear_cache
ConfigLoader.new.process

# Contract settings that differ from a default install: public signup is on so
# the signup flow can be tested.
InstallationConfig.find_by!(name: 'ENABLE_ACCOUNT_SIGNUP').update!(value: true)
GlobalConfig.clear_cache

account = Account.find_or_create_by!(name: 'Contract Co')

[
  { email: 'admin@contract.test', name: 'Ada Admin', role: :administrator },
  { email: 'agent@contract.test', name: 'Alan Agent', role: :agent }
].each do |attrs|
  user = User.find_or_initialize_by(email: attrs[:email])
  if user.new_record?
    user.assign_attributes(name: attrs[:name], password: PASSWORD, password_confirmation: PASSWORD)
    user.skip_confirmation!
    user.save!
  end
  AccountUser.find_or_create_by!(account: account, user: user) { |account_user| account_user.role = attrs[:role] }
end

puts "contract fixtures ready: account #{account.id}"
