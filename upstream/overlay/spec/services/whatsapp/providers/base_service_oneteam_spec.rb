require 'rails_helper'

# OneTeam coverage: the provider base class only defines the interface; each
# provider must override these methods.
RSpec.describe Whatsapp::Providers::BaseService do
  let(:service) { described_class.new(whatsapp_channel: build_stubbed(:channel_whatsapp)) }

  {
    send_message: ['+1', nil], send_template: ['+1', {}, nil], sync_template: [], validate_provider_config: [],
    error_message: []
  }.each do |name, arguments|
    it "makes providers implement #{name}" do
      expect { service.public_send(name, *arguments) }.to raise_error('Overwrite this method in child class')
    end
  end

  it 'logs a failed response with no message to update' do
    stub_request(:get, 'https://graph.example/fail').to_return(status: 500, body: 'bad')
    allow(Rails.logger).to receive(:error)

    service.handle_error(HTTParty.get('https://graph.example/fail'), nil)

    expect(Rails.logger).to have_received(:error).with('bad')
  end
end
