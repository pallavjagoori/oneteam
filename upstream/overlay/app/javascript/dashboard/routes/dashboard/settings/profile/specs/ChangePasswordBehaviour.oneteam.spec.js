/**
 * OneTeam behaviour spec for the change password form in profile
 * settings.
 *
 * Covers the submit button staying disabled until the current password
 * and a confirmation are entered, field errors on input and
 * blur, refusing an invalid form, saving the new password, and the API
 * error message (or the generic one when the error is empty).
 *
 * Chatwoot quirk: the button checks the `isEqPassword` validator object
 * (always truthy) instead of its result, so a mismatched confirmation
 * still enables the button; submit then refuses the invalid form.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ChangePassword from '../ChangePassword.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'error', 'type'],
  emits: ['update:modelValue', 'input', 'blur'],
  template: '<div class="field" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'type', 'disabled'],
  template: '<button :type="type">{{ label }}</button>',
};

const mountForm = () => {
  const dispatch = vi.fn().mockResolvedValue();
  const wrapper = mount(ChangePassword, {
    global: {
      mocks: { $store: { dispatch } },
      stubs: { WootInput, NextButton },
    },
  });
  return { wrapper, dispatch };
};

const fields = wrapper => wrapper.findAllComponents(WootInput);
const fill = async (wrapper, values) => {
  await Promise.all(
    values.map((value, index) =>
      fields(wrapper)[index].vm.$emit('update:modelValue', value)
    )
  );
};

describe('ChangePassword behaviour', () => {
  beforeEach(() => {
    useAlert.mockClear();
  });

  it('enables submit once the passwords are filled in', async () => {
    const { wrapper } = mountForm();
    const button = () => wrapper.findComponent(NextButton);
    expect(button().props('disabled')).toBe(true);
    await fill(wrapper, ['old-pass', 'secret1', '']);
    expect(button().props('disabled')).toBe(true);
    await fill(wrapper, ['old-pass', 'secret1', 'secret2']);
    expect(button().props('disabled')).toBe(false);
    await fill(wrapper, ['old-pass', 'secret1', 'secret1']);
    expect(button().props('disabled')).toBe(false);
  });

  it('shows field errors on input and blur', async () => {
    const { wrapper } = mountForm();
    await fill(wrapper, ['', 'abc', 'abd']);
    await fields(wrapper)[0].vm.$emit('blur');
    await fields(wrapper)[1].vm.$emit('input');
    await fields(wrapper)[2].vm.$emit('blur');
    expect(fields(wrapper).map(f => f.props('error'))).toEqual([
      'PROFILE_SETTINGS.FORM.CURRENT_PASSWORD.ERROR',
      'PROFILE_SETTINGS.FORM.PASSWORD.ERROR',
      'PROFILE_SETTINGS.FORM.PASSWORD_CONFIRMATION.ERROR',
    ]);
    expect(fields(wrapper)[0].classes()).toContain('error');

    await fields(wrapper)[0].vm.$emit('input');
    await fields(wrapper)[1].vm.$emit('blur');
    await fields(wrapper)[2].vm.$emit('input');
    await fill(wrapper, ['old-pass', 'secret1', 'secret1']);
    expect(fields(wrapper).map(f => f.props('error'))).toEqual(['', '', '']);
  });

  it('refuses an invalid form', async () => {
    const { wrapper, dispatch } = mountForm();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('PROFILE_SETTINGS.FORM.ERROR');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('saves the password and reports API errors', async () => {
    const { wrapper, dispatch } = mountForm();
    await fill(wrapper, ['old-pass', 'secret1', 'secret1']);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('updatePassword', {
      password: 'secret1',
      passwordConfirmation: 'secret1',
      currentPassword: 'old-pass',
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'PROFILE_SETTINGS.PASSWORD_UPDATE_SUCCESS'
    );

    dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Wrong password' } },
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Wrong password');

    dispatch.mockRejectedValueOnce('');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'RESET_PASSWORD.API.ERROR_MESSAGE'
    );
  });
});
