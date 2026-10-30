require 'rails_helper'

# OneTeam coverage for ConfigLoader reconciling settings and the default
# account features on boot: a changed lock flag counts as a change, and the
# feature defaults either keep existing values (adding only new features) or
# are reset to the shipped defaults.
describe ConfigLoader do
  let(:defaults) { YAML.safe_load(Rails.root.join('config/features.yml').read) }
  let(:first_feature) { defaults.first['name'] }

  def feature_defaults
    InstallationConfig.find_by!(name: 'ACCOUNT_LEVEL_FEATURE_DEFAULTS').value
  end

  before { described_class.new.process }

  def change_first_feature_and_drop_last
    edited = feature_defaults.map(&:dup)
    edited.first['enabled'] = !edited.first['enabled']
    edited.pop
    InstallationConfig.find_by!(name: 'ACCOUNT_LEVEL_FEATURE_DEFAULTS').update!(value: edited)
    edited.first['enabled']
  end

  it 'keeps edited feature defaults and adds missing ones by default' do
    edited_value = change_first_feature_and_drop_last

    described_class.new.process

    expect(feature_defaults.find { |feature| feature['name'] == first_feature }['enabled']).to eq(edited_value)
    expect(feature_defaults.size).to eq(defaults.size)
  end

  it 'resets feature defaults when not reconciling only new values' do
    edited_value = change_first_feature_and_drop_last

    described_class.new.process(reconcile_only_new: false)

    expect(feature_defaults.find { |feature| feature['name'] == first_feature }['enabled']).to eq(!edited_value)
  end

  it 'saves a setting again when only its lock flag differs' do
    loader = described_class.new
    allow(loader).to receive(:general_configs).and_return([{ name: 'WHO', value: 'x', locked: false }])
    loader.process
    InstallationConfig.find_by!(name: 'WHO').update!(locked: true)

    loader.process(reconcile_only_new: false)

    expect(InstallationConfig.find_by!(name: 'WHO').locked).to be(false)
  end
end
