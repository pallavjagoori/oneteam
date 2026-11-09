require 'rails_helper'

# OneTeam coverage for CSAT template edge paths: analysis without template
# parameters, a Twilio WhatsApp template created, and a provider error body
# that is not JSON.
RSpec.describe Api::V1::Accounts::InboxCsatTemplatesController do
  let(:controller_instance) { described_class.allocate }

  before { allow(controller_instance).to receive(:render) }

  it 'asks for template parameters when analysing without them' do
    allow(controller_instance).to receive(:extract_template_params).and_raise(ActionController::ParameterMissing.new(:template))

    controller_instance.analyze

    expect(controller_instance).to have_received(:render)
      .with(json: { error: 'Template parameters are required' }, status: :unprocessable_entity)
  end

  it 'describes a created Twilio WhatsApp template' do
    controller_instance.instance_variable_set(:@inbox, instance_double(Inbox, twilio_whatsapp?: true))

    controller_instance.send(:render_successful_template_creation, { friendly_name: 'csat', content_sid: 'HX1' })

    expect(controller_instance).to have_received(:render).with(
      json: { template: { friendly_name: 'csat', content_sid: 'HX1', status: 'pending', language: 'en' } }, status: :created
    )
  end

  it 'passes through provider errors that are not JSON' do
    expect(controller_instance.send(:parse_whatsapp_error, 'Bad Gateway')).to eq(user_message: nil, technical_details: 'Bad Gateway')
  end
end
