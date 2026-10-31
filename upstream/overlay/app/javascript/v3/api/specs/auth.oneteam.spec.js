/**
 * OneTeam specs for the login app's auth calls: sign-in with its MFA and
 * session-limit answers, sign-up errors, email confirmation and password
 * resets (including accounts that enforce MFA).
 */
import wootAPI from '../apiClient';
import {
  login,
  register,
  resetPassword,
  setNewPassword,
  verifyPasswordToken,
} from '../auth';
import {
  clearLocalStorageOnLogout,
  parseAPIErrorResponse,
  setAuthCredentials,
  throwErrorMessage,
} from 'dashboard/store/utils/api';

vi.mock('../apiClient', () => ({ default: { post: vi.fn(), put: vi.fn() } }));
vi.mock('dashboard/store/utils/api', () => ({
  setAuthCredentials: vi.fn(),
  throwErrorMessage: vi.fn(error => {
    throw error;
  }),
  clearLocalStorageOnLogout: vi.fn(),
  parseAPIErrorResponse: vi.fn(() => 'Invalid login credentials'),
}));

const mfaData = {
  mfa_required: true,
  mfa_token: 'mfa-1',
  verification_channel: 'totp',
};
const mfaSetupData = {
  mfa_setup_required: true,
  mfa_setup_token: 'setup-1',
  provisioning_url: 'otpauth://x',
  secret: 'ABC',
};
const failWith = (status, data) => {
  const error = new Error('request failed');
  error.response = { status, data };
  return error;
};

describe('login app auth API', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = { href: 'https://app.test/app/login' };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe('login', () => {
    it('signs in, saves the session and redirects to the dashboard', async () => {
      const response = {
        status: 200,
        data: { data: { id: 1, account_id: 7 } },
      };
      wootAPI.post.mockResolvedValue(response);

      const result = await login({
        email: 'a@b.c',
        password: 'x',
        redirectUrl: '',
      });

      expect(result).toBeNull();
      expect(wootAPI.post).toHaveBeenCalledWith('auth/sign_in', {
        email: 'a@b.c',
        password: 'x',
      });
      expect(setAuthCredentials).toHaveBeenCalledWith(response);
      expect(clearLocalStorageOnLogout).toHaveBeenCalled();
      expect(typeof window.location).toBe('string');
    });

    it('asks for a second factor or MFA setup when the server says so', async () => {
      wootAPI.post.mockResolvedValueOnce({ status: 206, data: mfaData });
      expect(await login({ email: 'a@b.c' })).toEqual({
        mfaRequired: true,
        mfaToken: 'mfa-1',
        verificationChannel: 'totp',
      });

      wootAPI.post.mockResolvedValueOnce({ status: 206, data: mfaSetupData });
      expect(await login({ email: 'a@b.c' })).toEqual({
        mfaSetupRequired: true,
        mfaSetupToken: 'setup-1',
        provisioningUrl: 'otpauth://x',
        secret: 'ABC',
      });
      expect(setAuthCredentials).not.toHaveBeenCalled();
    });

    it('handles the same answers when they arrive as errors', async () => {
      wootAPI.post.mockRejectedValueOnce(failWith(206, mfaData));
      expect((await login({})).mfaRequired).toBe(true);

      wootAPI.post.mockRejectedValueOnce(failWith(206, mfaSetupData));
      expect((await login({})).mfaSetupRequired).toBe(true);
    });

    it('lists the active sessions when the session limit is reached', async () => {
      wootAPI.post.mockRejectedValueOnce(
        failWith(409, {
          sessions_limit_reached: true,
          sessions: [{ id: 's1' }],
        })
      );

      expect(await login({})).toEqual({
        sessionsLimitReached: true,
        sessions: [{ id: 's1' }],
      });
    });

    it('throws a readable error carrying the error code', async () => {
      wootAPI.post.mockRejectedValueOnce(
        failWith(401, { error_code: 'account_locked' })
      );

      await expect(login({})).rejects.toMatchObject({
        message: 'Invalid login credentials',
        errorCode: 'account_locked',
      });
      expect(parseAPIErrorResponse).toHaveBeenCalled();
    });

    it('throws without an error code when the server sent no response', async () => {
      wootAPI.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(login({})).rejects.toMatchObject({ errorCode: undefined });
    });
  });

  it('turns sign-up failures into readable errors', async () => {
    const error = failWith(422, { message: 'Email already taken' });
    wootAPI.post.mockRejectedValueOnce(error);

    await expect(
      register({ email: 'john@acme.com', password: 'x' })
    ).rejects.toBe(error);
    expect(throwErrorMessage).toHaveBeenCalledWith(error);
  });

  it('returns nothing when the sign-up error handler does not throw', async () => {
    throwErrorMessage.mockImplementationOnce(() => {});
    wootAPI.post.mockRejectedValueOnce(failWith(500, {}));

    expect(
      await register({ email: 'john@acme.com', password: 'x' })
    ).toBeNull();
  });

  describe('email confirmation', () => {
    it('signs in after confirming', async () => {
      const response = { data: { data: { id: 3 } } };
      wootAPI.post.mockResolvedValueOnce(response);

      expect(await verifyPasswordToken({ confirmationToken: 't' })).toEqual({
        id: 3,
      });
      expect(setAuthCredentials).toHaveBeenCalledWith(response);
    });

    it('sends MFA accounts to the login page instead', async () => {
      wootAPI.post.mockResolvedValueOnce({
        data: { redirect_url: '/app/login' },
      });

      expect(await verifyPasswordToken({ confirmationToken: 't' })).toEqual({
        redirectUrl: '/app/login',
      });
      expect(setAuthCredentials).not.toHaveBeenCalled();
    });

    it('reports invalid tokens', async () => {
      const error = failWith(422, {});
      wootAPI.post.mockRejectedValueOnce(error);

      await expect(
        verifyPasswordToken({ confirmationToken: 'bad' })
      ).rejects.toBe(error);
    });
  });

  describe('setting a new password', () => {
    const params = {
      resetPasswordToken: 'r',
      password: 'p',
      confirmPassword: 'p',
    };

    it('saves the password and signs in', async () => {
      const response = { data: { data: { id: 4 } } };
      wootAPI.put.mockResolvedValueOnce(response);

      expect(await setNewPassword(params)).toEqual({ id: 4 });
      expect(wootAPI.put).toHaveBeenCalledWith('auth/password', {
        reset_password_token: 'r',
        password_confirmation: 'p',
        password: 'p',
      });
    });

    it('sends MFA accounts to the login page instead', async () => {
      wootAPI.put.mockResolvedValueOnce({
        data: { redirect_url: '/app/login' },
      });

      expect(await setNewPassword(params)).toEqual({
        redirectUrl: '/app/login',
      });
    });

    it('reports an expired reset link', async () => {
      const error = failWith(422, {});
      wootAPI.put.mockRejectedValueOnce(error);

      await expect(setNewPassword(params)).rejects.toBe(error);
    });
  });

  it('requests a reset email, scoped to an SSO account when given', async () => {
    await resetPassword({ email: 'a@b.c', redirectUrl: '/x' });
    await resetPassword({
      email: 'a@b.c',
      redirectUrl: '/x',
      ssoAccountId: '9',
    });

    expect(wootAPI.post).toHaveBeenNthCalledWith(1, 'auth/password', {
      email: 'a@b.c',
      redirect_url: '/x',
    });
    expect(wootAPI.post).toHaveBeenNthCalledWith(2, 'auth/password', {
      email: 'a@b.c',
      redirect_url: '/x',
      sso_account_id: '9',
    });
  });
});
