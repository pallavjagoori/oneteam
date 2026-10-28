import authAPI from 'dashboard/api/auth';
import SessionStorage from 'shared/helpers/sessionStorage';
import { clearCookiesOnLogout } from 'dashboard/store/utils/api';
import { actions, getters, mutations } from '../../auth';
import types from '../../../mutation-types';

/*
 * OneTeam coverage for the auth Vuex module: account-scoped getters,
 * the profile actions' error paths, impersonation, auto-offline and the
 * mutations that only touch the current account.
 */
vi.mock('dashboard/api/auth', () => ({
  default: Object.fromEntries(
    [
      'validityCheck',
      'hasAuthCookie',
      'profileUpdate',
      'profilePasswordUpdate',
      'deleteAvatar',
      'updateUISettings',
      'updateAutoOffline',
      'resetAccessToken',
      'resendConfirmation',
    ].map(name => [name, vi.fn()])
  ),
}));
vi.mock('dashboard/store/utils/api', () => ({
  setUser: vi.fn(),
  clearCookiesOnLogout: vi.fn(),
}));
vi.mock('shared/helpers/sessionStorage', () => ({ default: { get: vi.fn() } }));

const user = {
  id: 1,
  account_id: 1,
  accounts: [
    { id: 1, auto_offline: true, availability: 'online', onboarding_step: 'x' },
    { id: 2, auto_offline: false, availability: 'busy' },
  ],
};

describe('auth store (OneTeam)', () => {
  const commit = vi.fn();

  afterEach(() => vi.clearAllMocks());

  describe('getters', () => {
    const state = { currentUser: user, uiFlags: { isFetching: false } };

    it('reads the current account, or empty values without one', () => {
      expect(getters.getAuthUIFlags(state)).toEqual({ isFetching: false });
      expect(
        getters.getCurrentUserAutoOffline(state, { getCurrentAccountId: 2 })
      ).toBe(false);
      expect(
        getters.getCurrentAccount(state, { getCurrentAccountId: 9 })
      ).toEqual({});
      const noAccounts = { currentUser: {} };
      expect(getters.getUISettings(noAccounts)).toEqual({});
      expect(
        getters.getCurrentUserAutoOffline(noAccounts, {
          getCurrentAccountId: 1,
        })
      ).toBeUndefined();
    });

    it('reads the account id from the route only when present', () => {
      expect(
        getters.getCurrentAccountId(null, null, {
          route: { params: { accountId: '3' } },
        })
      ).toBe(3);
      expect(getters.getCurrentAccountId(null, null, { route: {} })).toBeNull();
      expect(
        getters.getCurrentAccountId(null, null, { route: { params: {} } })
      ).toBeNull();
    });
  });

  describe('actions', () => {
    it('signs out on an expired session only', async () => {
      authAPI.validityCheck.mockRejectedValueOnce({
        response: { status: 401 },
      });
      await actions.validityCheck({ commit });
      expect(clearCookiesOnLogout).toHaveBeenCalledTimes(1);

      authAPI.validityCheck.mockRejectedValueOnce(new Error('offline'));
      await actions.validityCheck({ commit });
      expect(clearCookiesOnLogout).toHaveBeenCalledTimes(1);
    });

    it('clears the user on logout', () => {
      actions.logout({ commit });
      expect(commit).toHaveBeenCalledWith(types.CLEAR_USER);
    });

    it.each([
      ['updateProfile', 'profileUpdate'],
      ['updatePassword', 'profilePasswordUpdate'],
    ])('%s stores the user and rethrows failures', async (action, method) => {
      authAPI[method].mockResolvedValueOnce({ data: { id: 1 } });
      await actions[action]({ commit }, {});
      expect(commit).toHaveBeenCalledWith(types.SET_CURRENT_USER, { id: 1 });

      const error = new Error('invalid');
      authAPI[method].mockRejectedValueOnce(error);
      await expect(actions[action]({ commit }, {})).rejects.toBe(error);
    });

    it('deletes the avatar, ignoring failures', async () => {
      authAPI.deleteAvatar.mockResolvedValueOnce({ data: { id: 1 } });
      await actions.deleteAvatar({ commit });
      expect(commit).toHaveBeenCalledWith(types.SET_CURRENT_USER, { id: 1 });
      authAPI.deleteAvatar.mockRejectedValueOnce(new Error('x'));
      await actions.deleteAvatar({ commit });
      expect(commit).toHaveBeenCalledTimes(1);
    });

    it('keeps UI settings local while impersonating', async () => {
      SessionStorage.get.mockReturnValue({ id: 9 });
      await actions.updateUISettings({ commit }, { uiSettings: { a: 1 } });
      expect(authAPI.updateUISettings).not.toHaveBeenCalled();
      expect(commit).toHaveBeenCalledWith(types.SET_CURRENT_USER_UI_SETTINGS, {
        uiSettings: { a: 1 },
      });
    });

    it('saves auto-offline, reverting on failure', async () => {
      const currentGetters = { getCurrentUserAutoOffline: true };
      authAPI.updateAutoOffline.mockResolvedValueOnce({ data: { id: 1 } });
      await actions.updateAutoOffline(
        { commit, getters: currentGetters },
        { accountId: 1, autoOffline: false }
      );
      expect(authAPI.updateAutoOffline).toHaveBeenCalledWith(1, false);
      expect(commit).toHaveBeenLastCalledWith(types.SET_CURRENT_USER, {
        id: 1,
      });

      authAPI.updateAutoOffline.mockRejectedValueOnce(new Error('x'));
      await actions.updateAutoOffline(
        { commit, getters: currentGetters },
        { accountId: 1, autoOffline: false }
      );
      expect(commit).toHaveBeenLastCalledWith(
        types.SET_CURRENT_USER_AUTO_OFFLINE,
        true
      );
    });

    it('reports whether the access token was reset', async () => {
      authAPI.resetAccessToken.mockRejectedValue(new Error('x'));
      await expect(actions.resetAccessToken({ commit })).resolves.toBe(false);
    });

    it('resends the confirmation email, ignoring failures', async () => {
      authAPI.resendConfirmation.mockResolvedValueOnce({});
      await actions.resendConfirmation();
      authAPI.resendConfirmation.mockRejectedValueOnce(new Error('x'));
      await expect(actions.resendConfirmation()).resolves.toBeUndefined();
      expect(authAPI.resendConfirmation).toHaveBeenCalledTimes(2);
    });
  });

  describe('mutations', () => {
    it('changes availability and auto-offline on the current account only', () => {
      const state = { currentUser: structuredClone(user) };
      mutations[types.SET_CURRENT_USER_AVAILABILITY](state, 'offline');
      mutations[types.SET_CURRENT_USER_AUTO_OFFLINE](state, false);
      expect(state.currentUser.accounts[0]).toMatchObject({
        availability: 'offline',
        availability_status: 'offline',
        autoOffline: false,
      });
      expect(state.currentUser.accounts[1]).toEqual(user.accounts[1]);
    });

    it('stores the current user', () => {
      const state = {};
      mutations[types.SET_CURRENT_USER](state, user);
      expect(state.currentUser).toBe(user);
    });
  });
});
