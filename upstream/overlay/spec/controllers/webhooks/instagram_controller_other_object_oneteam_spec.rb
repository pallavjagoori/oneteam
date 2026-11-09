require 'rails_helper'

# OneTeam coverage for Instagram webhook events about other objects, and the
# Facebook-page verify token.
RSpec.describe Webhooks::InstagramController do
  let(:controller_instance) { described_class.new }

  it 'rejects events that are not about Instagram' do
    allow(controller_instance).to receive(:params).and_return(ActionController::Parameters.new(object: 'page'))
    allow(controller_instance).to receive(:head)

    controller_instance.events

    expect(controller_instance).to have_received(:head).with(:unprocessable_entity)
  end

  it 'accepts the IG verify token' do
    allow(GlobalConfigService).to receive(:load).and_call_original
    allow(GlobalConfigService).to receive(:load).with('IG_VERIFY_TOKEN', '').and_return('ig-secret')

    expect(controller_instance.send(:valid_token?, 'ig-secret')).to be(true)
  end
end
