/**
 * OneTeam behaviour spec for the "forgot password" page.
 *
 * Covers the branded description, email validation and the disabled
 * submit, sending the reset request (with redirect and SSO account),
 * the success and failure alerts with and without a server message, and
 * the back-to-login link keeping the redirect and SSO params.
 */
import { flushPromises, mount } from '@vue/test-utils';
import ResetPassword from '../Index.vue';

const env = vi.hoisted(() => ({ reset: null, alert: null }));

vi.mock('../../../../../api/auth', () => ({
  resetPassword: (...args) => env.reset(...args),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `${text} [Acme]` }),
}));

const FormInput = {
  name: 'FormInput',
  props: ['modelValue', 'hasError'],
  emits: ['update:modelValue', 'input'],
  template:
    '<input :value="modelValue" :data-error="hasError" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'input\')" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['disabled', 'isLoading'],
  template: '<button type="submit" :disabled="disabled" :data-loading="isLoading" />',
};
const RouterLink = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
};

const mountPage = props =>
  mount(ResetPassword, {
    props,
    global: { stubs: { FormInput, NextButton, RouterLink }, mocks: { $t: key => key } },
  });
const link = wrapper => JSON.parse(wrapper.find('a').attributes('data-to'));

describe('Reset password page behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
    env.reset = vi.fn(() => Promise.resolve({ data: {} }));
  });

  it('validates the email and links back to login', async () => {
    const wrapper = mountPage();
    expect(wrapper.find('p').text()).toBe('RESET_PASSWORD.DESCRIPTION [Acme]');
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    await wrapper.find('input').setValue('bad');
    expect(wrapper.find('input').attributes('data-error')).toBe('true');
    await wrapper.find('input').setValue('me@acme.com');
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined();
    expect(link(wrapper)).toEqual({ name: 'login' });
  });

  it('sends the reset link with redirect details', async () => {
    let resolve;
    env.reset = vi.fn(
      () =>
        new Promise(r => {
          resolve = r;
        })
    );
    const wrapper = mountPage({ redirectUrl: 'https://app', ssoAccountId: '7' });
    expect(link(wrapper)).toEqual({
      name: 'login',
      query: { redirect_url: 'https://app', sso_account_id: '7' },
    });
    await wrapper.find('input').setValue('me@acme.com');
    await wrapper.find('form').trigger('submit');
    expect(env.reset).toHaveBeenCalledWith({
      email: 'me@acme.com',
      redirectUrl: 'https://app',
      ssoAccountId: '7',
    });
    expect(wrapper.find('button').attributes('data-loading')).toBe('true');
    resolve({ data: { message: 'Check your inbox' } });
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith('Check your inbox');
    expect(wrapper.find('button').attributes('data-loading')).toBe('false');
  });

  it('uses default alerts and keeps a redirect without SSO', async () => {
    const wrapper = mountPage({ redirectUrl: 'https://app' });
    expect(link(wrapper).query).toEqual({ redirect_url: 'https://app' });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.alert).toHaveBeenCalledWith('RESET_PASSWORD.API.SUCCESS_MESSAGE');

    env.reset = vi
      .fn()
      .mockRejectedValueOnce({ response: { data: { message: 'Unknown email' } } })
      .mockRejectedValueOnce(new Error('offline'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(env.alert.mock.calls.slice(1)).toEqual([
      ['Unknown email'],
      ['RESET_PASSWORD.API.ERROR_MESSAGE'],
    ]);
  });
});
