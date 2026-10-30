import assistantAPI from '../assistant';
import assistantStatsAPI from '../assistantStats';
import { useAxiosMock } from '../../specs/oneteamAxiosMock';

const url = '/api/v1/accounts/1/captain/assistants';
const offset = -new Date().getTimezoneOffset() / 60;

describe('CaptainAssistant API (OneTeam)', () => {
  const axios = useAxiosMock();
  const signal = new AbortController().signal;

  it('lists assistants, page 1 by default', () => {
    assistantAPI.get();
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: { page: 1, searchKey: undefined },
    });
  });

  it('sends a playground message, with config only when given', () => {
    assistantAPI.playground({
      assistantId: 2,
      messageContent: 'hi',
      messageHistory: [],
      requestId: 'r1',
    });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/playground`, {
      message_content: 'hi',
      message_history: [],
      request_id: 'r1',
    });
    assistantAPI.playground({
      assistantId: 2,
      messageContent: 'hi',
      playgroundConfig: { tone: 'friendly' },
    });
    expect(axios.post.mock.calls.at(-1)[1].playground_config).toEqual({
      tone: 'friendly',
    });
  });

  it('fetches metrics, attaching the signal only when given', () => {
    assistantAPI.getMetrics({ assistantId: 2, range: '7d' });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/metrics`, {
      params: { range: '7d', timezone_offset: offset },
    });
    assistantAPI.getMetrics({ assistantId: 2, range: '7d', signal });
    expect(axios.get.mock.calls.at(-1)[1].signal).toBe(signal);
  });

  it('fetches FAQ stats, attaching the signal only when given', () => {
    assistantAPI.getFaqStats({ assistantId: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/faq_stats`, {});
    assistantAPI.getFaqStats({ assistantId: 2, signal });
    expect(axios.get).toHaveBeenLastCalledWith(`${url}/2/faq_stats`, {
      signal,
    });
  });

  it('fetches the summary', () => {
    assistantAPI.getSummary({ assistantId: 2, range: '7d', stats: ['a'] });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/summary`, {
      params: { range: '7d', timezone_offset: offset, stats: ['a'] },
    });
  });

  it('drills down, attaching the signal only when given', () => {
    assistantAPI.getDrilldown({ assistantId: 2, metric: 'm', page: 1 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/drilldown`, {
      params: {
        metric: 'm',
        range: undefined,
        timezone_offset: offset,
        page: 1,
      },
    });
    assistantAPI.getDrilldown({ assistantId: 2, metric: 'm', signal });
    expect(axios.get.mock.calls.at(-1)[1].signal).toBe(signal);
  });
});

describe('CaptainAssistantStats API (OneTeam)', () => {
  const axios = useAxiosMock();

  it.each([
    ['getOverview', 'overview'],
    ['getOverviewSummary', 'overview_summary'],
    ['getResolutionFlow', 'resolution_flow'],
    ['getResolutionTrend', 'resolution_trend'],
    ['getDrilldown', 'drilldown'],
  ])('%s reads the %s stats', (method, endpoint) => {
    assistantStatsAPI[method]({ assistantId: 2, range: '7d' });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/stats/${endpoint}`, {
      params: {
        range: '7d',
        metric: undefined,
        reason: undefined,
        page: undefined,
        timezone_offset: offset,
      },
    });
  });

  it('attaches the signal when given', () => {
    const signal = new AbortController().signal;
    assistantStatsAPI.getOverview({ assistantId: 2, signal });
    expect(axios.get.mock.calls.at(-1)[1].signal).toBe(signal);
  });
});
