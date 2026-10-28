import campaignsAPI from '../campaigns';
import { useAxiosMock } from './oneteamAxiosMock';

describe('CampaignsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/campaigns';

  it('fetches analytics metrics', () => {
    campaignsAPI.analyticsMetrics(7);
    expect(axios.get).toHaveBeenCalledWith(`${url}/7/analytics/metrics`);
  });

  it('fetches analytics contacts filtered by status and page', () => {
    campaignsAPI.analyticsContacts(7, { status: 'failed', page: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/7/analytics/contacts`, {
      params: { status: 'failed', page: 2 },
    });
  });

  it('fetches analytics contacts without filters', () => {
    campaignsAPI.analyticsContacts(7);
    expect(axios.get).toHaveBeenCalledWith(`${url}/7/analytics/contacts`, {
      params: { status: undefined, page: undefined },
    });
  });
});
