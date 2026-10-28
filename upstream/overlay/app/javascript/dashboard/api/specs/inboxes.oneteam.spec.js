import inboxesAPI from '../inboxes';
import { useAxiosMock } from './oneteamAxiosMock';

describe('Inboxes API (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/inboxes';

  it('caches under the inbox model name', () => {
    expect(inboxesAPI.cacheModelName).toBe('inbox');
  });

  it.each([
    ['getCampaigns', 'get', 'campaigns'],
    ['getAgentBot', 'get', 'agent_bot'],
    ['getCSATTemplateStatus', 'get', 'csat_template'],
    ['syncTemplates', 'post', 'sync_templates'],
    ['resetSecret', 'post', 'reset_secret'],
    ['rotateHmacToken', 'post', 'rotate_hmac_token'],
    ['enableWhatsappCalling', 'post', 'enable_whatsapp_calling'],
    ['disableWhatsappCalling', 'post', 'disable_whatsapp_calling'],
    ['deleteInboxAvatar', 'delete', 'avatar'],
  ])('%s calls %s on the inbox %s endpoint', (method, verb, path) => {
    inboxesAPI[method](2);
    expect(axios[verb]).toHaveBeenCalledWith(`${url}/2/${path}`);
  });

  it('sets the agent bot', () => {
    inboxesAPI.setAgentBot(2, 7);
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/set_agent_bot`, {
      agent_bot: 7,
    });
  });

  it('fetches message templates with params and request config', () => {
    const signal = new AbortController().signal;
    inboxesAPI.getMessageTemplates(2, { q: 'hi' }, { signal });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/message_templates`, {
      signal,
      params: { q: 'hi' },
    });
    inboxesAPI.getMessageTemplates(2);
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/2/message_templates`, {
      params: {},
    });
  });

  it('updates the WhatsApp business management token', () => {
    inboxesAPI.updateWhatsappBusinessManagementToken(2, 'tok');
    expect(axios.put).toHaveBeenCalledWith(
      `${url}/2/whatsapp_business_management_token`,
      { business_management_token: 'tok' }
    );
  });

  it('creates and analyzes a CSAT template', () => {
    inboxesAPI.createCSATTemplate(2, { body: 'Rate us' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/csat_template`, {
      template: { body: 'Rate us' },
    });
    inboxesAPI.analyzeCSATTemplateUtility(2, { body: 'Rate us' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/csat_template/analyze`, {
      template: { body: 'Rate us' },
    });
  });

  it('configures calling', () => {
    inboxesAPI.setInboundCalls(2, true);
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/set_inbound_calls`, {
      inbound_calls_enabled: true,
    });
    inboxesAPI.setCallRecording(2, {
      recordingEnabled: true,
      transcriptionEnabled: false,
    });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/set_call_recording`, {
      recording_enabled: true,
      transcription_enabled: false,
    });
    inboxesAPI.setCallBusinessHours(2, { enabled: true, message: 'Closed' });
    expect(axios.patch).toHaveBeenCalledWith(`${url}/2/call_business_hours`, {
      business_hours_calls_enabled: true,
      out_of_hours_call_message: 'Closed',
    });
  });
});
