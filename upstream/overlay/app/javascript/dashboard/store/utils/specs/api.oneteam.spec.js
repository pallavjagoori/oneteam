import Cookies from 'js-cookie';
import { emitter } from 'shared/helpers/mitt';
import {
  deleteIndexedDBOnLogout,
  getHeaderExpiry,
  parseAPIErrorResponse,
  parseLinearAPIErrorResponse,
  setAuthCredentials,
} from '../api';

/*
 * OneTeam coverage for the store API utilities: saving the session cookie
 * after sign-in and deleting the browser databases on logout.
 */
vi.mock('js-cookie', () => ({ default: { set: vi.fn(), remove: vi.fn() } }));

describe('store API utils (OneTeam)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('saves the session headers until they expire and announces the user', () => {
    const emit = vi.spyOn(emitter, 'emit');
    const expiry = Math.floor(Date.now() / 1000) + 10 * 86400;
    const response = {
      headers: { expiry, 'access-token': 't' },
      data: { data: { id: 1 } },
    };
    expect(getHeaderExpiry(response)).toEqual(new Date(expiry * 1000));
    setAuthCredentials(response);
    expect(Cookies.set).toHaveBeenCalledWith(
      'cw_d_session_info',
      JSON.stringify(response.headers),
      { expires: expect.any(Number) }
    );
    expect(Cookies.set.mock.calls[0][2].expires).toBeGreaterThanOrEqual(9);
    expect(emit).toHaveBeenCalledWith(expect.any(String), {
      user: { id: 1 },
    });
  });

  describe('deleteIndexedDBOnLogout', () => {
    const requests = [];
    const fakeIndexedDB = databases => ({
      databases,
      deleteDatabase: vi.fn(() => {
        const request = {};
        requests.push(request);
        return request;
      }),
    });

    beforeEach(() => {
      requests.length = 0;
    });

    it('deletes every database the browser lists and logs the outcome', async () => {
      const original = window.indexedDB;
      window.indexedDB = fakeIndexedDB(async () => [
        { name: 'a' },
        { name: 'b' },
      ]);
      localStorage.setItem('cw-idb-names', '["old"]');
      // eslint-disable-next-line no-console
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      // eslint-disable-next-line no-console
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      await deleteIndexedDBOnLogout();
      expect(window.indexedDB.deleteDatabase.mock.calls).toEqual([
        ['a'],
        ['b'],
      ]);
      requests[0].onsuccess();
      requests[1].onerror('blocked');
      expect(log).toHaveBeenCalledWith('Database a deleted successfully.');
      expect(error).toHaveBeenCalledWith(
        'Error deleting database b.',
        'blocked'
      );
      expect(localStorage.getItem('cw-idb-names')).toBeNull();
      window.indexedDB = original;
    });

    it('falls back to the saved names when the browser cannot list databases', async () => {
      const original = window.indexedDB;
      window.indexedDB = fakeIndexedDB(async () => {
        throw new Error('unsupported');
      });
      localStorage.setItem('cw-idb-names', '["saved"]');
      await deleteIndexedDBOnLogout();
      expect(window.indexedDB.deleteDatabase).toHaveBeenCalledWith('saved');

      window.indexedDB.deleteDatabase.mockClear();
      await deleteIndexedDBOnLogout();
      expect(window.indexedDB.deleteDatabase).not.toHaveBeenCalled();
      window.indexedDB = original;
    });
  });

  it('reads the first entry of an errors list', () => {
    expect(
      parseAPIErrorResponse({ response: { data: { errors: ['Taken'] } } })
    ).toBe('Taken');
  });

  it('reads a Linear error or falls back to the default message', () => {
    expect(
      parseLinearAPIErrorResponse(
        { response: { data: { error: { errors: [{ message: 'No team' }] } } } },
        'Failed'
      )
    ).toBe('No team');
    expect(parseLinearAPIErrorResponse({ response: {} }, 'Failed')).toBe(
      'Failed'
    );
  });
});
