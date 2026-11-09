require 'rails_helper'

RSpec.describe Api::V1::Accounts::ConferenceController do
  it 'answers 409 when another agent already accepted the call' do
    controller_instance = described_class.new
    allow(controller_instance).to receive(:render)

    controller_instance.send(:render_call_already_accepted, StandardError.new('taken'))

    expect(controller_instance).to have_received(:render).with(json: { error: 'taken' }, status: :conflict)
  end
end
