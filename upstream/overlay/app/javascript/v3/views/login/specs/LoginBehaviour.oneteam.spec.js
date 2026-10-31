/**
 * OneTeam behaviour spec for the v3 login screen.
 *
 * Covers the login methods shown, OAuth/SAML error toasts, form validation,
 * every login API outcome (success, MFA challenge, enforced MFA setup,
 * session limit, unconfirmed user and failures), SSO auto-login and the
 * MFA / session-limit child flows.
 */
import { shallowMount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import Login from '../Index.vue';
import GoogleOAuthButton from '../../../components/GoogleOauth/Button.vue';
import SimpleDivider from '../../../components/Divider/SimpleDivider.vue';
import Spinner from 'shared/components/Spinner.vue';
import MfaVerification from 'dashboard/components/auth/MfaVerification.vue';
import MfaEnforcedSetup from 'dashboard/components/auth/MfaEnforcedSetup.vue';
import SessionLimitOverlay from 'dashboard/components/auth/SessionLimitOverlay.vue';

vi.mock('../../../api/auth', () => ({ login: vi.fn() }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/sessionStorage', () => ({ default: { set: vi.fn() } }));
vi.mock('dashboard/helper/AnalyticsHelper', () => ({
  default: { track: vi.fn() },
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `[${text}]` }),
}));

const { login } = await import('../../../api/auth');
const { useAlert } = await import('dashboard/composables');
const { default: SessionStorage } = await import(
  'shared/helpers/sessionStorage'
);
const { default: AnalyticsHelper } = await import(
  'dashboard/helper/AnalyticsHelper'
);

// Renders its default slot so the forgot-password link inside it shows up.
const FormInput = {
  name: 'FormInput',
  props: ['modelValue', 'hasError'],
  emits: ['update:modelValue', 'input'],
  template: '<div><slot /></div>',
};

const NextButton = {
  name: 'NextButton',
  props: ['isLoading', 'disabled'],
  template: '<button />',
};

const realLocation = window.location;
let router;
let globalConfig;

const mountLogin = (props = {}, route = { query: { error: 'x', a: '1' } }) =>
  shallowMount(Login, {
    props,
    global: {
      mocks: {
        $t: key => key,
        $store: { getters: { 'globalConfig/get': globalConfig } },
        $route: route,
        $router: router,
      },
      stubs: { RouterLink: RouterLinkStub, FormInput, NextButton },
    },
  });

const links = wrapper =>
  wrapper.findAllComponents(RouterLinkStub).map(l => l.props('to'));
const fill = async (wrapper, email, password) => {
  const [emailInput, passwordInput] = wrapper.findAllComponents(FormInput);
  await emailInput.vm.$emit('update:modelValue', email);
  await emailInput.vm.$emit('input');
  await passwordInput.vm.$emit('update:modelValue', password);
  await passwordInput.vm.$emit('input');
};
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

beforeEach(() => {
  delete window.location;
  window.location = { search: '' };
  window.chatwootConfig = {};
  router = { replace: vi.fn(), push: vi.fn() };
  globalConfig = { logo: '/logo.svg', installationName: 'OneTeam' };
  login.mockReset();
  vi.clearAllMocks();
});

afterEach(() => {
  window.location = realLocation;
});

describe('Login screen layout', () => {
  it('shows the email form only by default', () => {
    const wrapper = mountLogin();
    expect(wrapper.find('h2').text()).toBe('[LOGIN.TITLE]');
    expect(wrapper.findAll('img')).toHaveLength(1);
    expect(wrapper.findComponent(GoogleOAuthButton).exists()).toBe(false);
    expect(wrapper.findComponent(SimpleDivider).exists()).toBe(false);
    expect(links(wrapper)).toEqual([{ name: 'auth_reset_password' }]);
    expect(wrapper.find('section.mb-8').exists()).toBe(true);
  });

  it('shows Google, SAML, signup and the dark logo when enabled', () => {
    window.chatwootConfig = {
      allowedLoginMethods: ['email', 'google_oauth', 'saml'],
      googleOAuthClientId: 'gid',
      signupEnabled: 'true',
    };
    globalConfig.logoDark = '/dark.svg';
    const wrapper = mountLogin({ redirectUrl: 'app/x', ssoAccountId: '3' });
    expect(wrapper.findAll('img')).toHaveLength(2);
    expect(wrapper.findComponent(GoogleOAuthButton).props()).toMatchObject({
      redirectUrl: 'app/x',
      ssoAccountId: '3',
    });
    expect(wrapper.findComponent(SimpleDivider).exists()).toBe(true);
    expect(links(wrapper)).toEqual([
      { name: 'auth_signup' },
      {
        name: 'sso_login',
        query: { redirect_url: 'app/x', sso_account_id: '3' },
      },
      {
        name: 'auth_reset_password',
        query: { redirect_url: 'app/x', sso_account_id: '3' },
      },
    ]);
    expect(wrapper.find('section.mb-8').exists()).toBe(false);
  });

  it('needs a client id before offering Google', () => {
    window.chatwootConfig = { allowedLoginMethods: ['google_oauth'] };
    const wrapper = mountLogin();
    expect(wrapper.findComponent(GoogleOAuthButton).exists()).toBe(false);
  });

  it('builds SAML and reset routes from a redirect without an account', () => {
    window.chatwootConfig = { allowedLoginMethods: ['saml'] };
    const wrapper = mountLogin({ redirectUrl: 'app/y' });
    expect(links(wrapper)).toEqual([
      { name: 'sso_login', query: { redirect_url: 'app/y' } },
      { name: 'auth_reset_password', query: { redirect_url: 'app/y' } },
    ]);
  });

  it('keeps the plain SAML route without redirect details', () => {
    window.chatwootConfig = { allowedLoginMethods: ['saml'] };
    const wrapper = mountLogin();
    expect(links(wrapper)[0]).toEqual({ name: 'sso_login' });
  });

  it('offers signup for a pending Shopify install even when signup is off', () => {
    const wrapper = mountLogin({
      redirectUrl: `settings/integrations/shopify?shopify_pending_install=${'a'.repeat(32)}`,
    });
    expect(links(wrapper)[0]).toEqual({
      name: 'auth_signup',
      query: { shopify_pending_install: 'a'.repeat(32) },
    });
  });

  it('hides the reset link when profile updates are disabled', () => {
    globalConfig.disableUserProfileUpdate = true;
    const wrapper = mountLogin();
    expect(links(wrapper)).toEqual([]);
  });
});

describe('Login error toasts', () => {
  it.each([
    ['no-account-found', 'LOGIN.OAUTH.NO_ACCOUNT_FOUND'],
    ['business-account-only', 'LOGIN.OAUTH.BUSINESS_ACCOUNTS_ONLY'],
    ['shopify-installation-failed', 'LOGIN.OAUTH.SHOPIFY_INSTALLATION_FAILED'],
    ['saml-not-enabled', 'LOGIN.API.UNAUTH'],
    ['something-else', 'LOGIN.API.UNAUTH'],
  ])('shows %s and clears it from the URL', async (authError, message) => {
    window.requestIdleCallback = callback => callback();
    mountLogin({ authError });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message, { duration: 6000 });
    expect(router.replace).toHaveBeenCalledWith({
      query: { error: undefined, a: '1' },
    });
    delete window.requestIdleCallback;
  });

  it('falls back to a timeout without requestIdleCallback', async () => {
    vi.useFakeTimers();
    mountLogin({ authError: 'no-account-found' });
    await vi.runAllTimersAsync();
    expect(router.replace).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('Login form submission', () => {
  it('rejects an invalid email', async () => {
    const wrapper = mountLogin();
    await fill(wrapper, 'nope', 'secret');
    expect(wrapper.findAllComponents(FormInput)[0].props('hasError')).toBe(
      true
    );
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('LOGIN.EMAIL.ERROR');
    expect(login).not.toHaveBeenCalled();
  });

  it('logs in and marks impersonation sessions', async () => {
    let finish;
    login.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    window.location = { search: '?impersonation=true' };
    const wrapper = mountLogin({ redirectUrl: 'app/z' });
    await fill(wrapper, 'ann@example.com', 'secret');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    finish({});
    await flushPromises();
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);
    expect(login).toHaveBeenCalledWith({
      email: 'ann@example.com',
      password: 'secret',
      sso_auth_token: '',
      ssoAccountId: '',
      ssoConversationId: '',
      redirectUrl: 'app/z',
    });
    expect(SessionStorage.set).toHaveBeenCalledWith('impersonationUser', true);
    expect(useAlert).toHaveBeenCalledWith('LOGIN.API.SUCCESS_MESSAGE');
  });

  it('logs in without impersonation and handles an empty result', async () => {
    login.mockResolvedValue(undefined);
    const wrapper = mountLogin();
    await fill(wrapper, 'ann@example.com', 'secret');
    await submit(wrapper);
    expect(SessionStorage.set).not.toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith('LOGIN.API.SUCCESS_MESSAGE');
  });

  it('shows the API error and wiggles the form', async () => {
    login.mockRejectedValue({ message: 'Locked' });
    const wrapper = mountLogin();
    await fill(wrapper, 'ann@example.com', 'secret');
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('Locked');
    expect(wrapper.find('.animate-wiggle').exists()).toBe(true);
  });

  it('falls back to the unauthorised message', async () => {
    login.mockRejectedValue(undefined);
    const wrapper = mountLogin();
    await fill(wrapper, 'ann@example.com', 'secret');
    await submit(wrapper);
    expect(useAlert).toHaveBeenCalledWith('LOGIN.API.UNAUTH');
  });

  it('sends unconfirmed users to email verification', async () => {
    login.mockRejectedValue({ errorCode: 'user_not_confirmed' });
    const wrapper = mountLogin({ redirectUrl: 'app/z' });
    await fill(wrapper, 'ann@example.com', 'secret');
    await submit(wrapper);
    expect(router.push).toHaveBeenCalledWith({
      name: 'auth_verify_email',
      state: { email: 'ann@example.com', redirectUrl: 'app/z' },
    });
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('uses the email from the URL and resets the URL after a failure', async () => {
    login.mockRejectedValue({ message: 'Bad' });
    const wrapper = mountLogin({ email: 'ann%40example.com' });
    expect(wrapper.findComponent(Spinner).exists()).toBe(true);
    expect(wrapper.find('form').exists()).toBe(false);
    wrapper.vm.submitFormLogin();
    await flushPromises();
    expect(login.mock.calls[0][0].email).toBe('ann@example.com');
    expect(window.location).toBe('/app/login');
  });

  it('logs in straight away with an SSO token', async () => {
    login.mockResolvedValue({});
    mountLogin({
      ssoAuthToken: 'tok',
      ssoAccountId: '3',
      ssoConversationId: '9',
    });
    await flushPromises();
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({
        sso_auth_token: 'tok',
        ssoAccountId: '3',
        ssoConversationId: '9',
      })
    );
  });
});

describe('Login MFA', () => {
  const loginTo = async result => {
    login.mockResolvedValue(result);
    const wrapper = mountLogin({ ssoAccountId: '3', redirectUrl: 'app/z' });
    await fill(wrapper, 'ann@example.com', 'secret');
    await submit(wrapper);
    return wrapper;
  };

  it('shows the MFA challenge and returns to the form on cancel', async () => {
    const wrapper = await loginTo({
      mfaRequired: true,
      mfaToken: 'm1',
      verificationChannel: 'email',
    });
    const mfa = wrapper.findComponent(MfaVerification);
    expect(mfa.props()).toMatchObject({
      mfaToken: 'm1',
      verificationChannel: 'email',
    });
    await mfa.vm.$emit('cancel');
    expect(wrapper.findComponent(MfaVerification).exists()).toBe(false);
    expect(wrapper.findAllComponents(FormInput)[1].props('modelValue')).toBe(
      ''
    );
  });

  it('defaults the verification channel', async () => {
    const wrapper = await loginTo({ mfaRequired: true, mfaToken: 'm1' });
    expect(
      wrapper.findComponent(MfaVerification).props('verificationChannel')
    ).toBe(null);
  });

  it('redirects after the challenge is verified', async () => {
    const wrapper = await loginTo({ mfaRequired: true, mfaToken: 'm1' });
    await wrapper
      .findComponent(MfaVerification)
      .vm.$emit('verified', { accounts: [] });
    expect(typeof window.location).toBe('string');
  });

  it('switches from the challenge to the enforced setup', async () => {
    const wrapper = await loginTo({ mfaRequired: true, mfaToken: 'm1' });
    await wrapper.findComponent(MfaVerification).vm.$emit('setupRequired', {
      mfa_setup_token: 's1',
      provisioning_url: 'otpauth://x',
      secret: 'ABC',
    });
    expect(wrapper.findComponent(MfaEnforcedSetup).props()).toMatchObject({
      mfaSetupToken: 's1',
      provisioningUrl: 'otpauth://x',
      secret: 'ABC',
    });
  });

  it('shows the enforced setup from login, then cancels or completes it', async () => {
    const wrapper = await loginTo({
      mfaSetupRequired: true,
      mfaSetupToken: 's2',
      provisioningUrl: 'otpauth://y',
      secret: 'XYZ',
    });
    const setup = wrapper.findComponent(MfaEnforcedSetup);
    expect(setup.props('mfaSetupToken')).toBe('s2');
    await setup.vm.$emit('verified', { data: { accounts: [] } });
    expect(typeof window.location).toBe('string');
    window.location = { search: '' };
    await setup.vm.$emit('verified');
    expect(typeof window.location).toBe('string');
    await setup.vm.$emit('cancel');
    expect(wrapper.findComponent(MfaEnforcedSetup).exists()).toBe(false);
  });
});

describe('Login session limit', () => {
  const limited = {
    sessionsLimitReached: true,
    sessions: [{ id: 1 }, { id: 2 }],
  };
  const loginLimited = async () => {
    login.mockResolvedValue(limited);
    const wrapper = mountLogin();
    await fill(wrapper, 'ann@example.com', 'secret');
    await submit(wrapper);
    return wrapper;
  };
  const overlay = wrapper => wrapper.findComponent(SessionLimitOverlay);

  it('shows the active sessions and tracks the limit', async () => {
    const wrapper = await loginLimited();
    expect(overlay(wrapper).props('sessions')).toEqual(limited.sessions);
    expect(AnalyticsHelper.track).toHaveBeenCalledTimes(1);
    await overlay(wrapper).vm.$emit('cancel');
    expect(overlay(wrapper).exists()).toBe(false);
    expect(wrapper.findAllComponents(FormInput)[1].props('modelValue')).toBe(
      ''
    );
  });

  it.each([
    ['revoke', 2, { revoke_session_id: 2 }],
    ['revokeAll', undefined, { revoke_all_sessions: true }],
  ])('retries after %s', async (event, payload, extra) => {
    const wrapper = await loginLimited();
    login.mockResolvedValue({});
    await overlay(wrapper).vm.$emit(event, payload);
    await flushPromises();
    expect(login).toHaveBeenLastCalledWith(
      expect.objectContaining({ email: 'ann@example.com', ...extra })
    );
    expect(useAlert).toHaveBeenCalledWith('LOGIN.API.SUCCESS_MESSAGE');
  });

  it('handles MFA, another limit and failures on retry', async () => {
    const wrapper = await loginLimited();
    login.mockResolvedValue(limited);
    await overlay(wrapper).vm.$emit('revoke', 1);
    await flushPromises();
    expect(AnalyticsHelper.track).toHaveBeenCalledTimes(2);

    login.mockResolvedValue({ mfaRequired: true, mfaToken: 'm2' });
    await overlay(wrapper).vm.$emit('revoke', 1);
    await flushPromises();
    expect(wrapper.findComponent(MfaVerification).props()).toMatchObject({
      mfaToken: 'm2',
      verificationChannel: null,
    });
  });

  it('keeps the verification channel on an MFA retry', async () => {
    const wrapper = await loginLimited();
    login.mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'm3',
      verificationChannel: 'sms',
    });
    await overlay(wrapper).vm.$emit('revokeAll');
    await flushPromises();
    expect(
      wrapper.findComponent(MfaVerification).props('verificationChannel')
    ).toBe('sms');
  });

  it.each([
    [{ message: 'Nope' }, 'Nope'],
    [undefined, 'LOGIN.API.UNAUTH'],
  ])('reports a failed retry', async (error, message) => {
    const wrapper = await loginLimited();
    login.mockRejectedValue(error);
    await overlay(wrapper).vm.$emit('revokeAll');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
    expect(wrapper.find('.animate-wiggle').exists()).toBe(true);
  });

  it('retries with the email from the URL', async () => {
    login.mockResolvedValue(limited);
    const wrapper = mountLogin({ email: 'bo%40example.com' });
    wrapper.vm.submitFormLogin();
    await flushPromises();
    login.mockResolvedValue(undefined);
    await overlay(wrapper).vm.$emit('revokeAll');
    await flushPromises();
    expect(login.mock.calls[1][0].email).toBe('bo@example.com');
  });
});
