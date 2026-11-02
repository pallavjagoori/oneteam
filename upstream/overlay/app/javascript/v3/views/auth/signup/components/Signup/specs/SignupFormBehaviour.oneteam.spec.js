/**
 * OneTeam behaviour spec for the account signup form.
 *
 * Covers validation (business email, password rules), the password
 * requirements popover, terms links from the instance config, the Google
 * sign-up button rules, registering with and without hCaptcha (verify,
 * captcha errors, failures that reset the captcha), the redirect to email
 * verification, and ignoring double submits.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import SignupForm from '../Form.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vuex', () => ({
  useStore: () => ({ getters: { 'globalConfig/get': env.config } }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: env.push }) }));
vi.mock('../../../../../../api/auth', () => ({
  register: (...args) => env.register(...args),
}));

const FormInput = {
  name: 'FormInput',
  props: { modelValue: String, name: String, hasError: Boolean },
  emits: ['update:modelValue', 'blur', 'focus'],
  template: '<input :name="name" :value="modelValue" />',
};
const Captcha = {
  name: 'VueHcaptcha',
  props: ['sitekey'],
  emits: ['verify', 'error', 'expired', 'challengeExpired', 'closed'],
  methods: {
    execute: () => env.captcha.push('execute'),
    reset: () => env.captcha.push('reset'),
  },
  template: '<div class="captcha" />',
};
const SubmitButton = {
  name: 'NextButton',
  props: { disabled: Boolean, isLoading: Boolean },
  template: '<button type="submit" />',
};

const mountForm = (props = {}) =>
  mount(SignupForm, {
    props,
    global: {
      stubs: {
        FormInput,
        VueHcaptcha: Captcha,
        NextButton: SubmitButton,
        PasswordRequirements: { props: ['password'], template: '<div class="requirements" />' },
        GoogleOAuthButton: { template: '<div class="google"><slot /></div>' },
        Transition: { template: '<slot />' },
      },
    },
  });

const input = (wrapper, name) =>
  wrapper.findAllComponents(FormInput).find(i => i.props('name') === name);
const fill = async (wrapper, email = 'ada@acme.io', password = 'Secret#123') => {
  await input(wrapper, 'email_address').vm.$emit('update:modelValue', email);
  await input(wrapper, 'password').vm.$emit('update:modelValue', password);
};
const submit = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('Signup form behaviour', () => {
  beforeEach(() => {
    env.config = { termsURL: 'https://t.example', privacyURL: 'https://p.example' };
    env.push = vi.fn();
    env.register = vi.fn().mockResolvedValue({});
    env.captcha = [];
    window.chatwootConfig = {};
  });

  it('validates the email and password before registering', async () => {
    const wrapper = mountForm();
    expect(wrapper.findComponent(SubmitButton).props('disabled')).toBe(true);
    await fill(wrapper, 'ada@gmail.com', 'short');
    await input(wrapper, 'email_address').vm.$emit('blur');
    await submit(wrapper);
    expect(env.register).not.toHaveBeenCalled();
    expect(input(wrapper, 'email_address').props('hasError')).toBe(true);
    expect(input(wrapper, 'password').props('hasError')).toBe(true);
  });

  it('shows password requirements while the password is focused', async () => {
    const wrapper = mountForm();
    await input(wrapper, 'password').vm.$emit('focus');
    expect(wrapper.find('.requirements').exists()).toBe(true);
    await input(wrapper, 'password').vm.$emit('blur');
    expect(wrapper.find('.requirements').exists()).toBe(false);
  });

  it('registers and moves on to email verification', async () => {
    const wrapper = mountForm({ shopifyPendingInstall: 'shop-token' });
    await fill(wrapper);
    expect(wrapper.findComponent(SubmitButton).props('disabled')).toBe(false);
    await submit(wrapper);
    expect(env.register).toHaveBeenCalledWith({
      email: 'ada@acme.io',
      password: 'Secret#123',
      hCaptchaClientResponse: '',
      shopifyPendingInstallToken: 'shop-token',
    });
    expect(env.push).toHaveBeenCalledWith({
      name: 'auth_verify_email',
      state: { email: 'ada@acme.io' },
    });
  });

  it('ignores a second submit while registering and reports failures', async () => {
    let fail;
    env.register.mockReturnValueOnce(
      new Promise((_, reject) => {
        fail = reject;
      })
    );
    const wrapper = mountForm();
    await fill(wrapper);
    wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');
    expect(env.register).toHaveBeenCalledTimes(1);
    fail(new Error('Email taken'));
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Email taken');
    env.register.mockRejectedValueOnce({});
    await submit(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('REGISTER.API.ERROR_MESSAGE');
    expect(env.captcha).toEqual([]);
  });

  it('runs hCaptcha before registering and resets it on failures', async () => {
    env.config.hCaptchaSiteKey = 'site-key';
    const wrapper = mountForm();
    await fill(wrapper);
    await submit(wrapper);
    expect(env.captcha).toEqual(['execute']);
    expect(env.register).not.toHaveBeenCalled();
    env.register.mockRejectedValueOnce(new Error('Bad captcha'));
    await wrapper.findComponent(Captcha).vm.$emit('verify', 'token-1');
    await flushPromises();
    expect(env.register.mock.calls[0][0].hCaptchaClientResponse).toBe('token-1');
    expect(env.captcha).toEqual(['execute', 'reset']);
    await wrapper.findComponent(Captcha).vm.$emit('expired');
    expect(env.captcha).toEqual(['execute', 'reset', 'reset']);
    expect(wrapper.findComponent(SubmitButton).props('isLoading')).toBe(false);
  });

  it('fills the terms links and shows Google sign-up when allowed', () => {
    window.chatwootConfig = { allowedLoginMethods: ['email', 'google_oauth'], googleOAuthClientId: 'g-1' };
    const wrapper = mountForm();
    expect(wrapper.find('.google').exists()).toBe(true);
    expect(mountForm({ shopifyPendingInstall: 'x' }).find('.google').exists()).toBe(false);
    window.chatwootConfig = { allowedLoginMethods: ['google_oauth'] };
    expect(mountForm().find('.google').exists()).toBe(false);
    expect(wrapper.find('p').text()).toContain('REGISTER.TERMS_ACCEPT');
  });
});
