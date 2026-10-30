import summaryReportsAPI from '../summaryReports';
import { useAxiosMock } from './oneteamAxiosMock';

describe('SummaryReportsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v2/accounts/1/summary_reports';

  it.each([
    ['getTeamReports', 'team'],
    ['getAgentReports', 'agent'],
    ['getInboxReports', 'inbox'],
    ['getLabelReports', 'label'],
  ])('%s fetches the %s summary', (method, type) => {
    summaryReportsAPI[method]({ since: 1, until: 2, businessHours: true });
    expect(axios.get).toHaveBeenCalledWith(`${url}/${type}`, {
      params: { since: 1, until: 2, business_hours: true },
    });

    summaryReportsAPI[method]();
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/${type}`, {
      params: { since: undefined, until: undefined, business_hours: undefined },
    });
  });
});
