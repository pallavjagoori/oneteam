import monitorsAPI from '../monitors';
import { useAxiosMock } from './oneteamAxiosMock';

describe('MonitorsAPI (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = '/api/v1/accounts/1/monitors';
  const signal = new AbortController().signal;

  it('lists monitors', () => {
    monitorsAPI.get({ page: 1 }, signal);
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: { page: 1 },
      signal,
    });
  });

  it('fetches a timeseries', () => {
    monitorsAPI.timeseries(2, { range: '7d' }, signal);
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/timeseries`, {
      params: { range: '7d' },
      signal,
    });
  });

  it('fetches the matching conversations', () => {
    monitorsAPI.conversations({ monitorId: 2, signal, page: 3 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/2/conversations`, {
      params: { page: 3 },
      signal,
    });
  });

  it('retries evaluations', () => {
    monitorsAPI.retry(2, signal);
    expect(axios.post).toHaveBeenCalledWith(
      `${url}/2/retry_evaluations`,
      undefined,
      { signal }
    );
  });

  it('resumes a monitor', () => {
    monitorsAPI.resume(2, { force: true });
    expect(axios.post).toHaveBeenCalledWith(`${url}/2/resume`, {
      force: true,
    });
  });

  it('previews a condition', () => {
    monitorsAPI.preview({ metric: 'open' });
    expect(axios.post).toHaveBeenCalledWith(`${url}/preview`, {
      condition: { metric: 'open' },
    });
  });

  it('polls a preview', () => {
    monitorsAPI.previewStatus('tok');
    expect(axios.get).toHaveBeenCalledWith(`${url}/preview/tok`);
  });
});
