require 'rails_helper'

# OneTeam coverage for a WhatsApp CSAT template status check that fails.
RSpec.describe CsatSurveyService do
  it 'treats the template as unavailable when the status check raises' do
    channel = instance_double(Channel::Whatsapp)
    allow(channel).to receive(:provider_service).and_raise(StandardError, 'timeout')
    inbox = instance_double(Inbox, id: 1, csat_config: { 'template' => { 'name' => 'csat' } }, channel: channel)
    service = described_class.new(conversation: instance_double(Conversation, inbox: inbox))

    expect(service.send(:template_available_and_approved?)).to be(false)
  end
end
