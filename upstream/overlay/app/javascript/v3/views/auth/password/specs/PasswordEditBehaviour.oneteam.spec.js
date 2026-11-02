/**
 * OneTeam behaviour spec for the set new password page (reached from a
 * reset password email).
 *
 * Covers sending visitors without a token to the dashboard, validating
 * the password and its confirmation, the loading state, and where a
 * successful reset lands: the MFA sign-in page, the login redirect for
 * an SSO or app redirect, or the dashboard. Also covers failures with
 * and without an error message.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { setNewPassword } from '../../../../api/auth';
import { getLoginRedirectURL, getMfaSignInURL } from 'v3/helpers/AuthHelper';
import PasswordEdit from '../Edit.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../../../../api/auth', () => ({ setNewPassword: vi.fn() }));
vi.mock('v3/helpers/AuthHelper', () => ({
  getLoginRedirectURL: vi.fn(() => '/app/accounts/2'),
  getMfaSignInURL: vi.fn(({ loginUrl }) => `${loginUrl}?mfa`),
}));

const FormInput = {
  name: 'FormInput',
  props: ['modelValue', 'hasError', 'name'],
  emits: ['update:modelValue', 'blur'],
  template: '<div class="field" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['disabled', 'isLoading', 'type'],
  template: '<button :type="type" />',
};

const realLocation = window.location;

const mountPage = props =>
  mount(PasswordEdit, {
    props: { resetPasswordToken: 'tok', ...props },
    global: { stubs: { FormInput, NextButton } },
  });

const fill = async (wrapper, password, confirm) => {
  const [first, second] = wrapper.findAllComponents(FormInput);
  await first.vm.$emit('update:modelValue', password);
  await second.vm.$emit('update:modelValue', confirm);
};

describe('Set new password page behaviour', () => {
  beforeEach(() => {
    delete window.location;
    window.location = { href: 'http://localhost/' };
    useAlert.mockClear();
    setNewPassword.mockReset();
  });

  afterEach(() => {
    window.location = realLocation;
  });

  it('sends visitors without a token to the dashboard', () => {
    mountPage({ resetPasswordToken: '' });
    expect(window.location).toBe('/app/');
  });

  it('validates the new password', async () => {
    const wrapper = mountPage();
    const button = () => wrapper.findComponent(NextButton);
    expect(button().props('disabled')).toBe(true);
    const [first, second] = wrapper.findAllComponents(FormInput);
    await fill(wrapper, 'abc', 'abd');
    await first.vm.$emit('blur');
    await second.vm.$emit('blur');
    expect(first.props('hasError')).toBe(true);
    expect(second.props('hasError')).toBe(true);
    await fill(wrapper, 'secret1', 'secret2');
    expect(second.props('hasError')).toBe(true);
    await fill(wrapper, 'secret1', 'secret1');
    expect(first.props('hasError')).toBe(false);
    expect(button().props('disabled')).toBe(false);
  });

  it('lands on the MFA sign-in page when asked to', async () => {
    let finish;
    setNewPassword.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = mountPage({ redirectUrl: '/next', ssoAccountId: '4' });
    await fill(wrapper, 'secret1', 'secret1');
    await wrapper.find('form').trigger('submit');
    expect(setNewPassword).toHaveBeenCalledWith({
      confirmPassword: 'secret1',
      password: 'secret1',
      resetPasswordToken: 'tok',
    });
    expect(wrapper.findComponent(NextButton).props()).toMatchObject({
      isLoading: true,
      disabled: true,
    });
    finish({ redirectUrl: '/auth/mfa' });
    await flushPromises();
    expect(getMfaSignInURL).toHaveBeenCalledWith({
      loginUrl: '/auth/mfa',
      redirectUrl: '/next',
      ssoAccountId: '4',
    });
    expect(window.location).toBe('/auth/mfa?mfa');
  });

  it('follows a login redirect or falls back to the dashboard', async () => {
    const user = { id: 1 };
    setNewPassword.mockResolvedValueOnce(user);
    const redirected = mountPage({ redirectUrl: '/next' });
    await redirected.find('form').trigger('submit');
    await flushPromises();
    expect(getLoginRedirectURL).toHaveBeenCalledWith({
      redirectUrl: '/next',
      ssoAccountId: '',
      user,
    });
    expect(window.location).toBe('/app/accounts/2');

    getMfaSignInURL.mockReturnValueOnce('');
    setNewPassword.mockResolvedValueOnce({ redirectUrl: '/auth/mfa' });
    const plain = mountPage();
    await plain.find('form').trigger('submit');
    await flushPromises();
    expect(window.location).toBe('/app/');
  });

  it('reports failures', async () => {
    const wrapper = mountPage();
    setNewPassword.mockRejectedValueOnce(new Error('Token expired'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Token expired');
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);

    setNewPassword.mockRejectedValueOnce(undefined);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'SET_NEW_PASSWORD.API.ERROR_MESSAGE'
    );
  });
});
