/**
 * OneTeam behaviour spec for the "verify your email" page shown after
 * signup.
 *
 * Covers sending visitors without an email back to login, resending the
 * confirmation (success and error alerts, ignoring double clicks), and
 * the hCaptcha flow: executing the captcha, resending with its token,
 * resetting afterwards, and resetting on captcha errors.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { resendConfirmation } from '../../../../api/auth';
import VerifyEmail from '../Index.vue';

const push = vi.fn();
const execute = vi.fn();
const reset = vi.fn();

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../../../../api/auth', () => ({ resendConfirmation: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push }),
}));
vi.mock('@hcaptcha/vue3-hcaptcha', () => ({
  default: {
    name: 'VueHcaptcha',
    props: ['sitekey'],
    emits: ['verify', 'error', 'expired', 'challengeExpired', 'closed'],
    setup: () => ({ execute, reset }),
    template: '<div class="captcha" />',
  },
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'isLoading'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountPage = (props, config = {}) => {
  const store = createStore({ getters: { 'globalConfig/get': () => config } });
  return mount(VerifyEmail, {
    props,
    global: { plugins: [store], stubs: { NextButton } },
  });
};

const props = { email: 'me@acme.io', redirectUrl: '/app' };

describe('Verify email page behaviour', () => {
  it('sends visitors without an email to login', () => {
    mountPage({});
    expect(push).toHaveBeenCalledWith({ name: 'login' });
  });

  it('resends the confirmation without a captcha', async () => {
    let resolve;
    resendConfirmation.mockReturnValueOnce(
      new Promise(done => {
        resolve = done;
      })
    );
    const wrapper = mountPage(props);
    expect(push).not.toHaveBeenCalled();
    expect(wrapper.find('.captcha').exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(true);
    await wrapper.find('button').trigger('click');
    expect(resendConfirmation).toHaveBeenCalledTimes(1);
    expect(resendConfirmation).toHaveBeenCalledWith({
      email: 'me@acme.io',
      hCaptchaClientResponse: '',
      redirectUrl: '/app',
    });
    resolve();
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'REGISTER.VERIFY_EMAIL.RESEND_SUCCESS'
    );
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);

    resendConfirmation.mockRejectedValueOnce(new Error('x'));
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('REGISTER.VERIFY_EMAIL.RESEND_ERROR');
    expect(reset).not.toHaveBeenCalled();
  });

  it('runs the captcha before resending', async () => {
    resendConfirmation.mockResolvedValue();
    const wrapper = mountPage(props, { hCaptchaSiteKey: 'site' });
    const captcha = wrapper.findComponent({ name: 'VueHcaptcha' });
    expect(captcha.props('sitekey')).toBe('site');
    await wrapper.find('button').trigger('click');
    expect(execute).toHaveBeenCalled();
    expect(resendConfirmation).not.toHaveBeenCalled();

    await captcha.vm.$emit('verify', 'token-1');
    await flushPromises();
    expect(resendConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ hCaptchaClientResponse: 'token-1' })
    );
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it.each(['error', 'expired', 'challengeExpired', 'closed'])(
    'resets the captcha on %s',
    async event => {
      const wrapper = mountPage(props, { hCaptchaSiteKey: 'site' });
      await wrapper.findComponent({ name: 'VueHcaptcha' }).vm.$emit(event);
      expect(reset).toHaveBeenCalled();
      expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);
    }
  );
});
