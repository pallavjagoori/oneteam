import reportsAPI from '../reports';
import { useAxiosMock } from './oneteamAxiosMock';

describe('ReportsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v2/accounts/1/reports';
  const offset = -new Date().getTimezoneOffset() / 60;

  it('fetches reports for the account by default', () => {
    reportsAPI.getReports({ metric: 'conversations_count', from: 1, to: 2 });
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: expect.objectContaining({
        metric: 'conversations_count',
        since: 1,
        until: 2,
        type: 'account',
        timezone_offset: offset,
      }),
    });
  });

  it('drills down, passing the abort signal only when given', () => {
    reportsAPI.getDrilldown({ metric: 'm', bucketTimestamp: 5 });
    let config = axios.get.mock.calls.at(-1)[1];
    expect(axios.get.mock.calls.at(-1)[0]).toBe(`${url}/drilldown`);
    expect(config.params).toMatchObject({
      bucket_timestamp: 5,
      type: 'account',
    });
    expect(config).not.toHaveProperty('signal');

    const signal = new AbortController().signal;
    reportsAPI.getDrilldown({ metric: 'm', signal, page: 2, perPage: 10 });
    config = axios.get.mock.calls.at(-1)[1];
    expect(config.signal).toBe(signal);
    expect(config.params).toMatchObject({ page: 2, per_page: 10 });
  });

  it('fetches the summary for the account by default', () => {
    reportsAPI.getSummary(1, 2);
    expect(axios.get).toHaveBeenCalledWith(`${url}/summary`, {
      params: expect.objectContaining({ since: 1, until: 2, type: 'account' }),
    });
  });

  it('fetches conversation metrics with defaults', () => {
    reportsAPI.getConversationMetric();
    expect(axios.get).toHaveBeenCalledWith(`${url}/conversations`, {
      params: { type: 'account', page: 1 },
    });
  });

  it.each([
    ['getAgentReports', 'agents'],
    ['getConversationsSummaryReports', 'conversations_summary'],
    ['getLabelReports', 'labels'],
    ['getInboxReports', 'inboxes'],
    ['getTeamReports', 'teams'],
  ])('%s fetches the %s report', (method, path) => {
    reportsAPI[method]({ from: 1, to: 2, businessHours: true });
    expect(axios.get).toHaveBeenCalledWith(`${url}/${path}`, {
      params: { since: 1, until: 2, business_hours: true },
    });
  });

  it('fetches the conversation traffic CSV for the last week by default', () => {
    reportsAPI.getConversationTrafficCSV();
    expect(axios.get).toHaveBeenCalledWith(`${url}/conversation_traffic`, {
      params: { timezone_offset: offset, days_before: 6 },
    });
  });

  it('fetches bot metrics and summary without arguments', () => {
    reportsAPI.getBotMetrics();
    expect(axios.get).toHaveBeenCalledWith(`${url}/bot_metrics`, {
      params: { since: undefined, until: undefined },
    });
    reportsAPI.getBotSummary();
    expect(axios.get).toHaveBeenCalledWith(`${url}/bot_summary`, {
      params: expect.objectContaining({ type: 'account' }),
    });
  });
});
