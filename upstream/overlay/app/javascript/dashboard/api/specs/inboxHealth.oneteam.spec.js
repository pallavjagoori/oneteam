import inboxHealthAPI from '../inboxHealth';
import { useAxiosMock } from './oneteamAxiosMock';

describe('InboxHealthAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/inboxes';

  it('fetches the health status', () => {
    const signal = new AbortController().signal;
    inboxHealthAPI.getHealthStatus(3, { signal });
    expect(axios.get).toHaveBeenCalledWith(`${url}/3/health`, { signal });
  });

  it('fetches the health status without options', () => {
    inboxHealthAPI.getHealthStatus(3);
    expect(axios.get).toHaveBeenCalledWith(`${url}/3/health`, {
      signal: undefined,
    });
  });

  it('registers the webhook', () => {
    inboxHealthAPI.registerWebhook(3);
    expect(axios.post).toHaveBeenCalledWith(`${url}/3/register_webhook`);
  });
});
