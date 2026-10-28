import {
  fetchToolsCatalog,
  fetchToolsetDetails,
  isChatwootAuthor,
} from '../toolsCatalog';

describe('Captain tools catalog (OneTeam)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const respondWith = (ok, body, status = 200) => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok, status, json: () => Promise.resolve(body) })
    );
  };

  it('fetches the catalog JSON without credentials, trimming trailing slashes', async () => {
    respondWith(true, { toolsets: [] });
    const signal = new AbortController().signal;
    await expect(
      fetchToolsCatalog('https://tools.example.com/catalog//', { signal })
    ).resolves.toEqual({ toolsets: [] });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://tools.example.com/catalog.json',
      { signal, credentials: 'omit' }
    );
  });

  it('refuses when no catalog URL is configured', () => {
    expect(() => fetchToolsCatalog('')).toThrow(
      'The tools catalog URL is not configured'
    );
  });

  it('reports a failed response', async () => {
    respondWith(false, {}, 503);
    await expect(
      fetchToolsetDetails('https://tools.example.com/x.json')
    ).rejects.toThrow('Could not load the tools catalog: 503');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://tools.example.com/x.json',
      { signal: undefined, credentials: 'omit' }
    );
  });

  it('recognises Chatwoot as an author regardless of case', () => {
    expect(isChatwootAuthor('ChatWoot')).toBe(true);
    expect(isChatwootAuthor('someone')).toBe(false);
    expect(isChatwootAuthor(undefined)).toBe(false);
  });
});
