import Cookies from 'js-cookie';
import authAPI from '../auth';
import {
  clearCookiesOnLogout,
  deleteIndexedDBOnLogout,
} from '../../store/utils/api';
import { useAxiosMock } from './oneteamAxiosMock';

vi.mock('js-cookie', () => ({ default: { get: vi.fn() } }));
vi.mock('../../store/utils/api', () => ({
  clearCookiesOnLogout: vi.fn(),
  deleteIndexedDBOnLogout: vi.fn(),
}));

describe('auth API (OneTeam)', () => {
  const axios = useAxiosMock({ data: 'ok' });

  it('checks the session token', () => {
    authAPI.validityCheck();
    expect(axios.get).toHaveBeenCalledWith('/auth/validate_token');
  });

  describe('logout', () => {
    it('signs out and clears local data', async () => {
      await expect(authAPI.logout()).resolves.toEqual({ data: 'ok' });
      expect(axios.delete).toHaveBeenCalledWith('auth/sign_out');
      expect(deleteIndexedDBOnLogout).toHaveBeenCalled();
      expect(clearCookiesOnLogout).toHaveBeenCalled();
    });

    it('passes on a failed sign-out without clearing data', async () => {
      const error = new Error('offline');
      axios.delete.mockRejectedValueOnce(error);
      await expect(authAPI.logout()).rejects.toBe(error);
      expect(clearCookiesOnLogout).not.toHaveBeenCalled();
    });
  });

  describe('session cookie', () => {
    it('reads the saved session when the cookie exists', () => {
      Cookies.get.mockReturnValue('{"id":1}');
      expect(authAPI.hasAuthCookie()).toBe(true);
      expect(authAPI.getAuthData()).toEqual({ id: 1 });
    });

    it('falls back to an empty session if the cookie vanishes between reads', () => {
      Cookies.get.mockReturnValueOnce('{"id":1}').mockReturnValueOnce('');
      expect(authAPI.getAuthData()).toEqual({});
    });

    it('returns false without a cookie', () => {
      Cookies.get.mockReturnValue(undefined);
      expect(authAPI.hasAuthCookie()).toBe(false);
      expect(authAPI.getAuthData()).toBe(false);
    });
  });

  describe('profileUpdate', () => {
    it('sends set attributes, the display name and the avatar as form data', () => {
      const avatar = new File(['x'], 'me.png');
      authAPI.profileUpdate({
        displayName: 'Jo',
        avatar,
        name: 'Jo Doe',
        email: undefined,
      });
      const [url, form] = axios.put.mock.calls.at(-1);
      expect(url).toBe('/api/v1/profile');
      expect(form.get('profile[name]')).toBe('Jo Doe');
      expect(form.has('profile[email]')).toBe(false);
      expect(form.get('profile[display_name]')).toBe('Jo');
      expect(form.get('profile[avatar]')).toBeInstanceOf(File);
    });

    it('sends an empty display name and no avatar when they are missing', () => {
      authAPI.profileUpdate({});
      const form = axios.put.mock.calls.at(-1)[1];
      expect(form.get('profile[display_name]')).toBe('');
      expect(form.has('profile[avatar]')).toBe(false);
    });
  });

  it('changes the password', () => {
    authAPI.profilePasswordUpdate({
      currentPassword: 'old',
      password: 'new',
      passwordConfirmation: 'new',
    });
    expect(axios.put).toHaveBeenCalledWith('/api/v1/profile', {
      profile: {
        current_password: 'old',
        password: 'new',
        password_confirmation: 'new',
      },
    });
  });

  it('saves UI settings', () => {
    authAPI.updateUISettings({ uiSettings: { theme: 'dark' } });
    expect(axios.put).toHaveBeenCalledWith('/api/v1/profile', {
      profile: { ui_settings: { theme: 'dark' } },
    });
  });

  it('updates availability', () => {
    authAPI.updateAvailability({ availability: 'busy', account_id: 1 });
    expect(axios.post).toHaveBeenCalledWith('/api/v1/profile/availability', {
      profile: { availability: 'busy', account_id: 1 },
    });
  });

  it('updates auto-offline, off by default', () => {
    authAPI.updateAutoOffline(1);
    expect(axios.post).toHaveBeenCalledWith('/api/v1/profile/auto_offline', {
      profile: { account_id: 1, auto_offline: false },
    });
  });

  it('deletes the avatar', () => {
    authAPI.deleteAvatar();
    expect(axios.delete).toHaveBeenCalledWith('/api/v1/profile/avatar');
  });

  it('requests a password reset', () => {
    authAPI.resetPassword({ email: 'jo@example.com' });
    expect(axios.post).toHaveBeenCalledWith('auth/password', {
      email: 'jo@example.com',
    });
  });

  it('switches the active account', () => {
    authAPI.setActiveAccount({ accountId: 2 });
    expect(axios.put).toHaveBeenCalledWith(
      '/api/v1/profile/set_active_account',
      { profile: { account_id: 2 } }
    );
  });

  it('resends the confirmation email and resets the access token', () => {
    authAPI.resendConfirmation();
    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/profile/resend_confirmation'
    );
    authAPI.resetAccessToken();
    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/profile/reset_access_token'
    );
  });

  it('lists and revokes sessions', () => {
    authAPI.getSessions();
    expect(axios.get).toHaveBeenCalledWith('/api/v1/profile/sessions');
    authAPI.revokeSession(4);
    expect(axios.delete).toHaveBeenCalledWith('/api/v1/profile/sessions/4');
  });
});
