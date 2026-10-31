/**
 * OneTeam behaviour spec for the two-factor verification step at login.
 *
 * Covers OTP digit entry (digits only, auto-advance, arrow keys, backspace),
 * pasting a code, failures that clear and refocus the inputs (with the API
 * message or a fallback), ignoring submits while verifying, switching to
 * backup codes by tab or "try another method", submitting backup codes,
 * cancelling, the help dialog, and the cloud and self-hosted help copy.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import axios from 'axios';
import { parseAPIErrorResponse } from 'dashboard/store/utils/api';
import MfaVerification from '../MfaVerification.vue';

const env = vi.hoisted(() => ({ cloud: null, log: [] }));

vi.mock('axios');
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isOnChatwootCloud: env.cloud }),
}));
vi.mock('dashboard/store/utils/api', () => ({
  clearLocalStorageOnLogout: vi.fn(),
  parseAPIErrorResponse: vi.fn(),
  setAuthCredentials: vi.fn(),
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'type', 'disabled', 'isLoading'],
  emits: ['click'],
  template:
    '<button :type="type" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};
const FormInput = {
  name: 'FormInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input class="backup" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const Dialog = {
  name: 'Dialog',
  emits: ['confirm'],
  methods: {
    open: () => env.log.push('open'),
    close: () => env.log.push('close'),
  },
  template: '<div class="dialog"><slot /></div>',
};

const mountMfa = (props = {}) =>
  mount(MfaVerification, {
    props: { mfaToken: 'mfa', ...props },
    attachTo: document.body,
    global: { stubs: { NextButton, FormInput, Dialog, Icon: true } },
  });
const digits = wrapper => wrapper.findAll('input[maxlength="1"]');
const button = (wrapper, key) =>
  wrapper.findAll('button').find(b => b.text() === `MFA_VERIFICATION.${key}`);
const typeCode = async (wrapper, code) => {
  const inputs = digits(wrapper);
  await code.split('').reduce(async (previous, digit, i) => {
    await previous;
    await inputs[i].setValue(digit);
  }, Promise.resolve());
  await flushPromises();
};
const paste = (wrapper, text) =>
  digits(wrapper)[0].trigger('paste', {
    clipboardData: { getData: () => text },
  });

describe('MfaVerification behaviour', () => {
  let wrapper;
  beforeEach(() => {
    env.cloud = ref(false);
    env.log = [];
    axios.post.mockResolvedValue({ status: 200, data: { data: { id: 1 } } });
  });
  afterEach(() => wrapper?.unmount());

  it('accepts digits only and moves focus forward', async () => {
    wrapper = mountMfa();
    await digits(wrapper)[0].setValue('a');
    expect(digits(wrapper)[0].element.value).toBe('');
    await digits(wrapper)[0].setValue('4');
    await flushPromises();
    expect(document.activeElement).toBe(digits(wrapper)[1].element);
    expect(
      button(wrapper, 'VERIFY_BUTTON').attributes('disabled')
    ).toBeDefined();
  });

  it('moves with arrow keys and backspace', async () => {
    wrapper = mountMfa();
    await digits(wrapper)[2].trigger('keydown', { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(digits(wrapper)[1].element);
    await digits(wrapper)[2].trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement).toBe(digits(wrapper)[3].element);
    await digits(wrapper)[0].trigger('keydown', { key: 'ArrowLeft' });

    await digits(wrapper)[1].setValue('7');
    await digits(wrapper)[2].trigger('keydown', { key: 'Backspace' });
    expect(document.activeElement).toBe(digits(wrapper)[1].element);
    expect(digits(wrapper)[1].element.value).toBe('');
    await digits(wrapper)[3].setValue('8');
    await digits(wrapper)[3].trigger('keydown', { key: 'Backspace' });
    expect(digits(wrapper)[3].element.value).toBe('8');
    await digits(wrapper)[0].trigger('keydown', { key: 'Backspace' });
  });

  it('submits a pasted code and ignores partial pastes', async () => {
    wrapper = mountMfa();
    await paste(wrapper, '12-34');
    expect(axios.post).not.toHaveBeenCalled();
    await paste(wrapper, '123 456');
    await flushPromises();
    expect(axios.post).toHaveBeenCalledWith('/auth/sign_in', {
      mfa_token: 'mfa',
      otp_code: '123456',
    });
    expect(wrapper.emitted('verified')).toEqual([[{ id: 1 }]]);
  });

  it('clears and refocuses the digits when verification fails', async () => {
    axios.post.mockRejectedValueOnce(new Error('bad'));
    parseAPIErrorResponse.mockReturnValueOnce('Invalid code');
    wrapper = mountMfa();
    await typeCode(wrapper, '111111');
    expect(wrapper.find('.text-n-ruby-9').text()).toBe('Invalid code');
    expect(
      digits(wrapper)
        .map(d => d.element.value)
        .join('')
    ).toBe('');
    expect(document.activeElement).toBe(digits(wrapper)[0].element);

    axios.post.mockRejectedValueOnce(new Error('bad'));
    await typeCode(wrapper, '222222');
    expect(wrapper.find('.text-n-ruby-9').text()).toBe(
      'MFA_VERIFICATION.VERIFICATION_FAILED'
    );
  });

  it('ignores submits while verifying', async () => {
    let finish;
    axios.post.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    wrapper = mountMfa();
    await paste(wrapper, '123456');
    await wrapper.find('form').trigger('submit');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(
      button(wrapper, 'VERIFY_BUTTON').attributes('disabled')
    ).toBeDefined();
    finish({ status: 200, data: {} });
    await flushPromises();
    expect(wrapper.emitted('verified')).toEqual([[undefined]]);
  });

  it('switches to backup codes and submits them', async () => {
    wrapper = mountMfa();
    await button(wrapper, 'BACKUP_CODE').trigger('click');
    expect(digits(wrapper)).toHaveLength(0);
    await wrapper.find('.backup').setValue('1234');
    await wrapper.find('form').trigger('submit');
    expect(axios.post).not.toHaveBeenCalled();
    await wrapper.find('.backup').setValue('abcd1234');
    await wrapper.findComponent(FormInput).trigger('keyup', { key: 'Enter' });
    await flushPromises();
    expect(axios.post).toHaveBeenCalledWith('/auth/sign_in', {
      mfa_token: 'mfa',
      backup_code: 'abcd1234',
    });
    await button(wrapper, 'AUTHENTICATOR_APP').trigger('click');
    expect(digits(wrapper)).toHaveLength(6);
  });

  it('clears a rejected backup code', async () => {
    axios.post.mockRejectedValueOnce(new Error('bad'));
    wrapper = mountMfa();
    await button(wrapper, 'TRY_ANOTHER_METHOD').trigger('click');
    await wrapper.find('.backup').setValue('abcd1234');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('.backup').element.value).toBe('');
    expect(wrapper.find('.text-n-ruby-9').exists()).toBe(true);
    await button(wrapper, 'TRY_ANOTHER_METHOD').trigger('click');
    expect(digits(wrapper)).toHaveLength(6);
    expect(wrapper.find('.text-n-ruby-9').exists()).toBe(false);
  });

  it('cancels and opens the help dialog', async () => {
    wrapper = mountMfa();
    await button(wrapper, 'CANCEL_LOGIN').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    await button(wrapper, 'LEARN_MORE').trigger('click');
    await wrapper.findComponent(Dialog).vm.$emit('confirm');
    expect(env.log).toEqual(['open', 'close']);
    expect(wrapper.text()).toContain(
      'MFA_VERIFICATION.HELP_MODAL.CONTACT_DESC_SELF_HOSTED'
    );
  });

  it('shows cloud contact help', () => {
    env.cloud = ref(true);
    wrapper = mountMfa();
    expect(wrapper.text()).toContain(
      'MFA_VERIFICATION.HELP_MODAL.CONTACT_DESC_CLOUD'
    );
  });
});
