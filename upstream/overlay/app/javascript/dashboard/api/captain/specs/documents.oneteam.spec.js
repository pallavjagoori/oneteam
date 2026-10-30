import documentAPI from '../document';
import responseAPI from '../response';
import { useAxiosMock } from '../../specs/oneteamAxiosMock';

const base = '/api/v1/accounts/1/captain';

describe('CaptainDocument API (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = `${base}/documents`;

  it('lists documents, page 1 by default', () => {
    documentAPI.get();
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: {
        page: 1,
        search_key: undefined,
        assistant_id: undefined,
        filter: undefined,
        source: undefined,
        sort: undefined,
      },
    });
  });

  it('syncs a document', () => {
    documentAPI.sync(4);
    expect(axios.post).toHaveBeenCalledWith(`${url}/4/sync`);
  });

  it('drills down, attaching the signal only when given', () => {
    documentAPI.getDrilldown({ documentId: 4, page: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/4/drilldown`, {
      params: { page: 2 },
    });
    const signal = new AbortController().signal;
    documentAPI.getDrilldown({ documentId: 4, signal });
    expect(axios.get.mock.calls.at(-1)[1].signal).toBe(signal);
  });
});

describe('CaptainResponses API (OneTeam)', () => {
  const axios = useAxiosMock();
  const url = `${base}/assistant_responses`;

  it('lists responses, page 1 by default', () => {
    responseAPI.get();
    expect(axios.get).toHaveBeenCalledWith(url, {
      params: {
        page: 1,
        search: undefined,
        assistant_id: undefined,
        document_id: undefined,
      },
      signal: undefined,
    });
  });

  it('drills down, attaching the signal only when given', () => {
    responseAPI.getDrilldown({ responseId: 4, page: 2 });
    expect(axios.get).toHaveBeenCalledWith(`${url}/4/drilldown`, {
      params: { page: 2 },
    });
    const signal = new AbortController().signal;
    responseAPI.getDrilldown({ responseId: 4, signal });
    expect(axios.get.mock.calls.at(-1)[1].signal).toBe(signal);
  });
});
