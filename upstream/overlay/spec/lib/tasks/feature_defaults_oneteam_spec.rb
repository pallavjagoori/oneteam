require 'rails_helper'

# OneTeam coverage for `rake feature_defaults:toggle`, the console menu that
# changes which features new accounts start with.
RSpec.describe 'feature_defaults:toggle' do # rubocop:disable RSpec/DescribeClass
  let!(:config) do
    InstallationConfig.find_or_initialize_by(name: 'ACCOUNT_LEVEL_FEATURE_DEFAULTS').tap do |record|
      record.value = [{ 'name' => 'help_center', 'display_name' => 'Help Center', 'enabled' => false },
                      { 'name' => 'campaigns', 'display_name' => 'Campaigns', 'enabled' => true }]
      record.save!
    end
  end

  def enabled(name)
    config.reload.value.find { |feature| feature['name'] == name }['enabled']
  end

  it 'turns features on and off' do
    output = run_rake('feature_defaults:toggle', input: "1\ntrue\n2\nfalse\nq\n").output

    expect(enabled('help_center')).to be(true)
    expect(enabled('campaigns')).to be(false)
    expect(output).to include('Updated help_center to enabled: true', 'Done.')
  end

  it 'ignores invalid choices and cancelled changes' do
    output = run_rake('feature_defaults:toggle', input: "9\nabc\n1\nmaybe\nQ\n").output

    expect(output).to include('Invalid selection.', 'Cancelled.')
    expect(enabled('help_center')).to be(false)
  end
end
