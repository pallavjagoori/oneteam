require 'rails_helper'

# OneTeam coverage for CSAT surveys on Twilio WhatsApp inboxes, which go out
# as an approved Twilio template carrying the conversation id, and for the
# survey's label rules ("contains" a label, or an unknown rule that sends).
describe CsatSurveyService do
  let(:channel) { create(:channel_twilio_sms, medium: :whatsapp) }
  let(:inbox) { channel.inbox }
  let(:contact_inbox) { create(:contact_inbox, inbox: inbox, source_id: 'whatsapp:+15552223333') }
  let(:conversation) { create(:conversation, inbox: inbox, contact_inbox: contact_inbox, contact: contact_inbox.contact, status: :resolved) }
  let(:csat_config) { { 'template' => { 'content_sid' => 'HX1' } } }
  let(:templates) { instance_double(Twilio::CsatTemplateService) }
  let(:sender) { instance_double(Twilio::SendOnTwilioService) }
  let(:regular_survey) { instance_double(MessageTemplates::Template::CsatSurvey, perform: true) }

  before do
    inbox.update!(csat_survey_enabled: true, csat_config: csat_config)
    allow(Twilio::CsatTemplateService).to receive(:new).and_return(templates)
    allow(templates).to receive(:get_template_status).with('HX1').and_return(success: true, template: { status: 'approved' })
    allow(Twilio::SendOnTwilioService).to receive(:new).and_return(sender)
    allow(Rails.logger).to receive(:error)
    # The regular survey only goes out inside WhatsApp's 24-hour reply window.
    allow(conversation).to receive(:can_reply?).and_return(true)
  end

  def survey
    described_class.new(conversation: conversation.reload).perform
  end

  it 'sends the approved Twilio template and keeps its message id' do
    expect(sender).to receive(:send_csat_template_message)
      .with(phone_number: 'whatsapp:+15552223333', content_sid: 'HX1', content_variables: { '1' => conversation.uuid })
      .and_return(success: true, message_id: 'SM1')

    survey

    expect(conversation.messages.find_by(content_type: :input_csat)).to have_attributes(source_id: 'SM1')
  end

  it 'logs a failed send' do
    allow(sender).to receive(:send_csat_template_message).and_raise(StandardError, 'down')

    survey

    expect(Rails.logger).to have_received(:error).with("Error sending Twilio WhatsApp CSAT template for conversation #{conversation.id}: down")
  end

  it 'falls back to the regular survey when the template is not approved or cannot be checked' do
    allow(templates).to receive(:get_template_status).and_return({ success: true, template: { status: 'pending' } })
    expect(MessageTemplates::Template::CsatSurvey).to receive(:new).twice.and_return(regular_survey)
    survey

    allow(templates).to receive(:get_template_status).and_raise(StandardError, 'timeout')
    survey

    expect(Rails.logger).to have_received(:error).with('Error checking Twilio CSAT template status: timeout')
  end

  context 'without a saved Twilio content id' do
    let(:csat_config) { { 'template' => { 'friendly_name' => 'csat' } } }

    it 'sends the regular survey' do
      expect(MessageTemplates::Template::CsatSurvey).to receive(:new).and_return(regular_survey)

      survey
    end
  end

  context 'with label rules' do
    before do
      allow(templates).to receive(:get_template_status).and_return(success: false)
      allow(MessageTemplates::Template::CsatSurvey).to receive(:new).and_return(regular_survey)
    end

    it 'sends only when the conversation has one of the labels' do
      inbox.update!(csat_config: { 'survey_rules' => { 'operator' => 'contains', 'values' => ['vip'] } })
      survey
      expect(regular_survey).not_to have_received(:perform)

      conversation.update_labels(['vip'])
      survey
      expect(regular_survey).to have_received(:perform).once
    end

    it 'sends for an operator it does not know' do
      inbox.update!(csat_config: { 'survey_rules' => { 'operator' => 'starts_with', 'values' => ['vip'] } })

      survey

      expect(regular_survey).to have_received(:perform)
    end
  end
end
