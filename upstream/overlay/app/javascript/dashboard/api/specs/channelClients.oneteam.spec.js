import googleClient from '../channel/googleClient';
import instagramClient from '../channel/instagramClient';
import microsoftClient from '../channel/microsoftClient';
import twitterClient from '../channel/twitterClient';
import whatsappChannel from '../channel/whatsappChannel';
import { useAxiosMock } from './oneteamAxiosMock';

const base = '/api/v1/accounts/1';

describe('channel OAuth clients (OneTeam)', () => {
  const axios = useAxiosMock();

  it.each([
    [googleClient, 'google'],
    [instagramClient, 'instagram'],
    [microsoftClient, 'microsoft'],
  ])('starts the OAuth flow (%#)', (client, provider) => {
    client.generateAuthorization({ email: 'jo@example.com' });
    expect(axios.post).toHaveBeenCalledWith(
      `${base}/${provider}/authorization`,
      { email: 'jo@example.com' }
    );
  });

  it('starts the Twitter OAuth flow', () => {
    twitterClient.generateAuthorization();
    expect(axios.post).toHaveBeenCalledWith(`${base}/twitter/authorization`);
  });
});

describe('WhatsappChannel API (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = `${base}/whatsapp`;

  it('creates an embedded signup', () => {
    whatsappChannel.createEmbeddedSignup({ code: 'c' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/authorization`, {
      code: 'c',
    });
  });

  it('requests embedded signup access', () => {
    whatsappChannel.requestEmbeddedSignupAccess('support');
    expect(axios.post).toHaveBeenCalledWith(`${url}/access_request`, {
      use_case: 'support',
    });
  });

  it('reauthorizes an inbox', () => {
    whatsappChannel.reauthorizeWhatsApp({ inboxId: 4, code: 'c' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/authorization`, {
      code: 'c',
      inbox_id: 4,
    });
  });

  it('previews and connects a manual setup', () => {
    whatsappChannel.previewManualSetup({ token: 't' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/manual/preview`, {
      token: 't',
    });
    whatsappChannel.connectManualSetup({ token: 't' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/manual/connect`, {
      token: 't',
    });
  });

  it('checks and sets up the manual webhook', () => {
    whatsappChannel.getManualWebhookStatus(4);
    expect(axios.get).toHaveBeenCalledWith(`${url}/manual/4/webhook_status`);
    whatsappChannel.setupManualWebhook(4);
    expect(axios.post).toHaveBeenCalledWith(`${url}/manual/4/setup_webhook`);
  });
});
