/**
 * OneTeam behaviour spec for the email confirmation page.
 *
 * Covers redirecting to MFA sign in, to the login redirect, and to the
 * default URL when the token is rejected.
 */
import { mount, flushPromises } from '@vue/test-utils';
import Confirmation from '../Index.vue';
import { verifyPasswordToken } from '../../../../api/auth';
import { DEFAULT_REDIRECT_URL } from 'dashboard/constants/globals';

vi.mock('../../../../api/auth', () => ({ verifyPasswordToken: vi.fn() }));
vi.mock('../../../../helpers/AuthHelper', () => ({
  getMfaSignInURL: ({ loginUrl, redirectUrl, ssoAccountId }) =>
    loginUrl === 'skip' ? '' : `mfa:${loginUrl}:${redirectUrl}:${ssoAccountId}`,
  getLoginRedirectURL: ({ user }) => `login:${user?.id}`,
}));

/**
 * Mounts the page and waits for the redirect.
 *
 * @returns {Promise<import('@vue/test-utils').VueWrapper>}
 */
const mountPage = async () => {
  const wrapper = mount(Confirmation, {
    props: {
      confirmationToken: 'tok',
      redirectUrl: '/next',
      ssoAccountId: '3',
    },
    global: { mocks: { $t: key => key }, stubs: { Spinner: true } },
  });
  await flushPromises();
  return wrapper;
};

describe('Confirmation page behaviour', () => {
  beforeEach(() => {
    vi.stubGlobal('location', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to MFA sign in when the user has a redirect url', async () => {
    verifyPasswordToken.mockResolvedValue({ redirectUrl: '/mfa' });
    const wrapper = await mountPage();
    expect(verifyPasswordToken).toHaveBeenCalledWith({
      confirmationToken: 'tok',
    });
    expect(window.location).toBe('mfa:/mfa:/next:3');
    expect(wrapper.text()).toContain('CONFIRM_EMAIL');
  });

  it.each([[{ id: 5 }], [{ id: 5, redirectUrl: 'skip' }]])(
    'falls back to the login redirect',
    async user => {
      verifyPasswordToken.mockResolvedValue(user);
      await mountPage();
      expect(window.location).toBe('login:5');
    }
  );

  it('redirects to the default url when the token is rejected', async () => {
    verifyPasswordToken.mockRejectedValue(new Error('bad'));
    await mountPage();
    expect(window.location).toBe(DEFAULT_REDIRECT_URL);
  });
});
