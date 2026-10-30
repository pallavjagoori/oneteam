require 'rails_helper'

# OneTeam coverage for CSAT survey templates on Twilio WhatsApp inboxes. A
# template is created in Twilio's Content API, then submitted for WhatsApp
# approval; its status is read back from both. The requests are faked with
# WebMock, so their shape is pinned for the port.
RSpec.describe Twilio::CsatTemplateService do
  let(:content_url) { 'https://content.twilio.com/v1/Content' }
  let(:approval_url) { 'https://content.twilio.com/v1/Content/HX1/ApprovalRequests/whatsapp' }
  let(:channel) { create(:channel_twilio_sms, :whatsapp, account_sid: 'AC1', auth_token: 'secret') }
  let(:inbox) { channel.inbox }
  let(:service) { described_class.new(channel) }
  let(:config) { { template_name: 'csat', message: 'How did we do?', base_url: 'https://chat.example' } }

  # A JSON reply: json(sid: 'HX1') or json({ message: 'bad' }, status: 400).
  def json(body = nil, status: 200, **fields)
    { status: status, body: (body || fields).to_json, headers: { 'Content-Type' => 'application/json' } }
  end

  def created(links: { approval_create: approval_url })
    stub_request(:post, content_url).to_return(json(sid: 'HX1', links: links))
  end

  describe '#create_template' do
    it 'creates a call-to-action template and submits it for WhatsApp approval' do
      created
      approval = stub_request(:post, approval_url).with(body: { name: 'csat', category: 'UTILITY' }.to_json)
                                                  .to_return(json(sid: 'AR1', whatsapp: { status: 'received' }))

      result = service.create_template(config.merge(language: 'fr', button_text: 'Rate'))

      expect(result).to eq(success: true, content_sid: 'HX1', friendly_name: 'csat', language: 'fr', status: 'PENDING',
                           approval_sid: 'AR1', whatsapp_status: 'received')
      expect(approval).to have_been_requested
      expect(a_request(:post, content_url).with(
               headers: { 'Authorization' => "Basic #{Base64.strict_encode64('AC1:secret')}" },
               body: {
                 friendly_name: 'csat', language: 'fr', variables: { '1' => '12345' },
                 types: { 'twilio/call-to-action' => {
                   body: 'How did we do?',
                   actions: [{ type: 'URL', title: 'Rate', url: 'https://chat.example/survey/responses/{{1}}' }]
                 } }
               }.to_json
             )).to have_been_made
    end

    it 'defaults the language, the button and the WhatsApp status' do
      created
      stub_request(:post, approval_url).to_return(json(sid: 'AR1'))

      expect(service.create_template(config)).to include(language: 'en', whatsapp_status: 'PENDING')
      expect(a_request(:post, content_url).with { |request| request.body.include?('"title":"Please rate us"') }).to have_been_made
    end

    it 'signs with the API key when the channel has one' do
      channel.update!(api_key_sid: 'SK1')
      created(links: {})

      service.create_template(config)

      expect(a_request(:post, content_url).with(headers: { 'Authorization' => "Basic #{Base64.strict_encode64('SK1:secret')}" }))
        .to have_been_made
    end

    it 'names a replacement template with the next version' do
      inbox.update!(csat_config: { 'template' => { 'friendly_name' => "customer_satisfaction_survey_#{inbox.id}_2" } })
      created(links: {})

      expect(service.create_template(config)[:friendly_name]).to eq("customer_satisfaction_survey_#{inbox.id}_3")
    end

    it 'reports the template as created when approval submission fails' do
      created
      stub_request(:post, approval_url).to_return(json({ message: 'nope' }, status: 400))

      expect(service.create_template(config)).to eq(success: true, content_sid: 'HX1', friendly_name: 'csat', language: 'en',
                                                    status: 'created')
    end

    it 'stays pending when Twilio gives no approval link' do
      created(links: {})

      expect(service.create_template(config)).to eq(success: true, content_sid: 'HX1', friendly_name: 'csat', language: 'en',
                                                    status: 'PENDING')
    end

    it 'returns the error body when creation fails' do
      stub_request(:post, content_url).to_return(json({ message: 'bad' }, status: 400))

      expect(service.create_template(config)).to eq(success: false, error: 'Template creation failed',
                                                    response_body: { message: 'bad' }.to_json)
    end
  end

  describe '#delete_template' do
    it 'deletes the given template, or the inbox’s current one' do
      inbox.update!(csat_config: { 'template' => { 'content_sid' => 'HX9' } })
      stub_request(:delete, "#{content_url}/HX1").to_return(status: 204)
      stub_request(:delete, "#{content_url}/HX9").to_return(status: 204)

      expect(service.delete_template(nil, 'HX1')).to include(success: true)
      expect(service.delete_template).to include(success: true)
      expect(a_request(:delete, "#{content_url}/HX9")).to have_been_made
    end

    it 'needs a template to delete' do
      expect(service.delete_template).to eq(success: false, error: 'No template to delete')
    end
  end

  describe '#get_template_status' do
    before { stub_request(:get, "#{content_url}/HX1").to_return(json(friendly_name: 'csat', language: 'de')) }

    it 'reads the WhatsApp approval status and name' do
      stub_request(:get, "#{content_url}/HX1/ApprovalRequests").to_return(json(whatsapp: { name: 'csat_wa', status: 'approved' }))

      expect(service.get_template_status('HX1'))
        .to eq(success: true, template: { content_sid: 'HX1', friendly_name: 'csat_wa', status: 'approved', language: 'de' })
    end

    it 'falls back to the template’s own name and a pending status' do
      stub_request(:get, "#{content_url}/HX1/ApprovalRequests").to_return(json(whatsapp: {}))
      stub_request(:get, "#{content_url}/HX1").to_return(json(friendly_name: 'csat'))

      expect(service.get_template_status('HX1'))
        .to eq(success: true, template: { content_sid: 'HX1', friendly_name: 'csat', status: 'pending', language: 'en' })
    end

    it 'is pending until WhatsApp has an approval request' do
      stub_request(:get, "#{content_url}/HX1/ApprovalRequests").to_return(json({}, status: 404))

      expect(service.get_template_status('HX1')[:template]).to include(status: 'pending', language: 'de')
    end

    it 'reports a missing template' do
      stub_request(:get, "#{content_url}/HX1").to_return(status: 404, body: '')

      expect(service.get_template_status('HX1')).to eq(success: false, error: 'Template not found')
    end

    it 'needs a content SID' do
      expect(service.get_template_status(nil)).to eq(success: false, error: 'No content SID provided')
    end

    it 'returns a network error instead of raising' do
      stub_request(:get, "#{content_url}/HX1").to_timeout

      expect(service.get_template_status('HX1')).to include(success: false, error: a_string_including('execution expired'))
    end
  end
end
