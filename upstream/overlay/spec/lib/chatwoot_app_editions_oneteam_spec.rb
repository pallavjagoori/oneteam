require 'rails_helper'

RSpec.describe ChatwootApp do
  describe '.self_hosted_enterprise?' do
    it 'is true for a self hosted install on the enterprise plan' do
      allow(described_class).to receive_messages(enterprise?: true, chatwoot_cloud?: false)
      allow(GlobalConfig).to receive(:get_value).with('INSTALLATION_PRICING_PLAN').and_return('enterprise')

      expect(described_class.self_hosted_enterprise?).to be(true)
    end
  end

  describe '.help_center_root' do
    it 'prefers HELPCENTER_URL over FRONTEND_URL' do
      with_modified_env HELPCENTER_URL: 'https://help.example.com', FRONTEND_URL: 'https://app.example.com' do
        expect(described_class.help_center_root).to eq('https://help.example.com')
      end
    end
  end

  describe '.extensions' do
    it 'includes custom when a custom folder exists' do
      allow(described_class).to receive(:custom?).and_return(true)

      expect(described_class.extensions).to eq(%w[enterprise custom])
    end

    it 'is empty for a community install' do
      allow(described_class).to receive_messages(custom?: false, enterprise?: false)

      expect(described_class.extensions).to eq([])
    end
  end
end
