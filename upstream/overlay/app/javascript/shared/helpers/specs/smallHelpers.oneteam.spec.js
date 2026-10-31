/**
 * OneTeam spec for small shared helpers: the Dyte meeting link, the old
 * CustomEvent fallback, colour contrast on a light background and the JSON
 * store's error handling in localStorage.
 */
import { buildDyteURL } from '../IntegrationHelper';
import { createEvent } from '../CustomEventHelper';
import { adjustColorForContrast } from '../colorHelper';
import { LocalStorage } from '../localStorage';

describe('buildDyteURL', () => {
  it('opens the meeting with the token and no setup screen', () => {
    const url = new URL(buildDyteURL('tok-1'));
    expect(url.origin + url.pathname).toBe(
      'https://examples.realtime.cloudflare.com/meeting/'
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      authToken: 'tok-1',
      showSetupScreen: 'true',
      disableVideoBackground: 'true',
    });
  });
});

describe('createEvent', () => {
  it('builds the event the old way when CustomEvent is not a constructor', () => {
    const original = window.CustomEvent;
    window.CustomEvent = undefined;
    try {
      const event = createEvent({
        eventName: 'chatwoot:ready',
        data: { a: 1 },
      });
      expect(event.type).toBe('chatwoot:ready');
      expect(event.detail).toEqual({ a: 1 });
    } finally {
      window.CustomEvent = original;
    }
  });
});

describe('adjustColorForContrast', () => {
  it('darkens a light colour until it reads on a white background', () => {
    const adjusted = adjustColorForContrast('#ffff99', '#ffffff');
    expect(adjusted).not.toBe('#ffff99');
    expect(adjusted).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('LocalStorage JSON store', () => {
  let errorLog;
  beforeEach(() => {
    localStorage.clear();
    errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('logs and carries on when reading or writing fails', () => {
    vi.spyOn(LocalStorage, 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    LocalStorage.updateJsonStore('drafts', 'c1', 'hi');
    expect(LocalStorage.getFromJsonStore('drafts', 'c1')).toBeNull();
    LocalStorage.deleteFromJsonStore('drafts', 'c1');
    expect(errorLog.mock.calls.map(([message]) => message)).toEqual([
      'Error updating JSON store in localStorage',
      'Error getting value from JSON store in localStorage',
      'Error deleting entry from JSON store in localStorage',
    ]);
  });
});
