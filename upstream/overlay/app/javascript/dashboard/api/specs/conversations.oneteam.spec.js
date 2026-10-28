import conversationsAPI from '../conversations';
import { useAxiosMock } from './oneteamAxiosMock';

describe('ConversationApi (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/conversations';

  it('fetches labels', () => {
    conversationsAPI.getLabels(2);
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/labels`);
  });

  it('fetches campaign history before a cursor', () => {
    const signal = new AbortController().signal;
    conversationsAPI.getCampaignHistory(2, { before: 10, signal });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/campaign_history`, {
      params: { before: 10 },
      signal,
    });
  });

  it('fetches campaign history without options', () => {
    conversationsAPI.getCampaignHistory(2);
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/campaign_history`, {
      params: { before: undefined },
      signal: undefined,
    });
  });

  it('updates labels', () => {
    conversationsAPI.updateLabels(2, ['vip']);
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/labels`, {
      labels: ['vip'],
    });
  });

  it('fetches suggestions of a type', () => {
    conversationsAPI.getSuggestions(2, 'reply');
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/suggestions/reply`);
  });

  it('fetches unread counts', () => {
    conversationsAPI.getUnreadCounts();
    expect(axios.get).toHaveBeenCalledWith(`${url}/unread_counts`);
  });
});
