require 'rails_helper'

RSpec.describe Platform::Api::V1::UsersController do
  it 'keeps the stored custom attributes when none are sent' do
    controller_instance = described_class.new
    user = create(:user, custom_attributes: { 'plan' => 'pro' })
    controller_instance.instance_variable_set(:@resource, user)
    allow(controller_instance).to receive(:user_params).and_return(ActionController::Parameters.new({}).permit!)

    expect(controller_instance.send(:user_custom_attributes)).to eq('plan' => 'pro')
  end
end
