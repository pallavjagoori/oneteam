require 'rails_helper'

# OneTeam coverage for CSAT survey templates on Twilio WhatsApp inboxes:
# creating a template replaces the previous one and saves the new Twilio
# content id on the inbox, and the status check asks Twilio about that id.
describe CsatTemplateManagementService do
  let(:channel) { create(:channel_twilio_sms, medium: :whatsapp) }
  let(:inbox) { channel.inbox }
  let(:twilio) { instance_double(Twilio::CsatTemplateService) }
  let(:service) { described_class.new(inbox.reload) }

  before do
    allow(Twilio::CsatTemplateService).to receive(:new).and_return(twilio)
    allow(Rails.logger).to receive(:warn)
    allow(Rails.logger).to receive(:error)
  end

  def save_template(template)
    inbox.update!(csat_config: { 'template' => template })
  end

  describe '#create_template' do
    let(:created) do
      { success: true, friendly_name: 'csat', content_sid: 'HXnew', approval_sid: nil, language: 'en', status: 'pending' }
    end

    it 'saves the new Twilio template on the inbox' do
      allow(twilio).to receive(:create_template).and_return(created)

      service.create_template(message: 'How did we do?')

      expect(inbox.reload.csat_config['template']).to include('content_sid' => 'HXnew', 'status' => 'pending')
      expect(inbox.csat_config['template']).not_to have_key('approval_sid')
    end

    it 'deletes the previous template first' do
      save_template('content_sid' => 'HXold')
      allow(twilio).to receive(:create_template).and_return(created)
      expect(twilio).to receive(:delete_template).with(nil, 'HXold').and_return(success: true)

      service.create_template(message: 'How did we do?')
    end

    it 'still creates the template when the old one cannot be deleted' do
      save_template('content_sid' => 'HXold')
      allow(twilio).to receive_messages(delete_template: { success: false, response_body: 'busy' }, create_template: created)

      expect(service.create_template(message: 'Hi')).to include(success: true)
      expect(Rails.logger).to have_received(:warn).with(/Failed to delete existing Twilio CSAT template 'HXold'.*busy/)
    end

    it 'skips deleting a saved template with no content id' do
      save_template('friendly_name' => 'csat')
      allow(twilio).to receive(:create_template).and_return(created)
      expect(twilio).not_to receive(:delete_template)

      service.create_template(message: 'Hi')
    end

    it 'logs a deletion error and carries on' do
      save_template('content_sid' => 'HXold')
      allow(twilio).to receive(:delete_template).and_raise(StandardError, 'timeout')
      allow(twilio).to receive(:create_template).and_return(created)

      expect(service.create_template(message: 'Hi')).to include(success: true)
      expect(Rails.logger).to have_received(:error).with(/Error during template deletion .*timeout/)
    end
  end

  describe '#template_status' do
    it 'reports no template when none has a content id' do
      save_template('friendly_name' => 'csat')

      expect(service.template_status).to eq(template_exists: false)
    end

    it 'returns the Twilio approval status' do
      save_template('content_sid' => 'HX1', 'friendly_name' => 'csat', 'language' => 'en')
      allow(twilio).to receive(:get_template_status).with('HX1').and_return(success: true, template: { status: 'approved' })

      expect(service.template_status).to eq(template_exists: true, friendly_name: 'csat', content_sid: 'HX1', status: 'approved', language: 'en')
    end

    it 'reports a missing template when Twilio does not find it' do
      save_template('content_sid' => 'HX1')
      allow(twilio).to receive(:get_template_status).and_return({ success: false }, nil)

      expect(service.template_status).to eq(template_exists: false, error: 'Template not found')
      expect(service.template_status).to eq(template_exists: false, error: 'Template not found')
    end
  end
end
