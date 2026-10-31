/**
 * OneTeam behaviour spec for the two-factor setup wizard.
 *
 * Covers QR generation (success, failure, and the URL-prop fallback),
 * copying the secret, verifying a code (including double-submit and
 * cancel-while-verifying guards), verification errors, the backup-code
 * step (copy, download, confirm and complete), and resetting when the
 * wizard is reopened.
 */
import { flushPromises, mount } from '@vue/test-utils';
import QRCode from 'qrcode';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { useAlert } from 'dashboard/composables';
import MfaSetupWizard from '../MfaSetupWizard.vue';

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn() } }));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const NextButton = {
  name: 'Button',
  props: ['label', 'disabled'],
  template: '<button :disabled="disabled">{{ label }}</button>',
};
const NextInput = {
  name: 'Input',
  props: ['modelValue', 'message'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" :data-message="message" @input="$emit(`update:modelValue`, $event.target.value)" />',
};

const mountWizard = (props = {}) =>
  mount(MfaSetupWizard, {
    props: {
      showSetup: true,
      mfaEnabled: false,
      secretKey: 'SECRET',
      ...props,
    },
    global: {
      stubs: { Button: NextButton, Input: NextInput, Icon: true },
      mocks: { $t: key => key },
    },
  });

const button = (wrapper, label) =>
  wrapper.findAll('button').find(b => b.text() === label);
const codeInput = wrapper => wrapper.findAll('input')[1];

describe('MfaSetupWizard behaviour', () => {
  beforeEach(() => {
    QRCode.toDataURL.mockResolvedValue('data:image/png;qr');
  });

  it('renders nothing unless setup is open for a user without MFA', () => {
    expect(mountWizard({ showSetup: false }).find('h3').exists()).toBe(false);
    expect(mountWizard({ mfaEnabled: true }).find('h3').exists()).toBe(false);
  });

  it('builds the QR code or falls back to the URL prop', async () => {
    let wrapper = mountWizard({ provisioningUri: 'otpauth://x' });
    expect(wrapper.text()).toContain('MFA_SETTINGS.SETUP.LOADING_QR');
    await flushPromises();
    expect(wrapper.find('img').attributes('src')).toBe('data:image/png;qr');
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      'otpauth://x',
      expect.objectContaining({ width: 256 })
    );

    QRCode.toDataURL.mockRejectedValue(new Error('bad'));
    wrapper = mountWizard({ provisioningUri: 'otpauth://y' });
    await flushPromises();
    expect(wrapper.find('img').exists()).toBe(false);

    wrapper = mountWizard({ qrCodeUrlProp: 'https://qr.example/1.png' });
    await flushPromises();
    expect(wrapper.find('img').attributes('src')).toBe(
      'https://qr.example/1.png'
    );
    expect(mountWizard().find('img').exists()).toBe(false);
  });

  it('copies the secret key', async () => {
    const wrapper = mountWizard();
    await button(wrapper, 'MFA_SETTINGS.SETUP.COPY').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('SECRET');
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.SETUP.SECRET_COPIED');
  });

  it('verifies a code once and ignores cancel while verifying', async () => {
    const wrapper = mountWizard();
    const verify = () => button(wrapper, 'MFA_SETTINGS.SETUP.VERIFY_BUTTON');
    expect(verify().attributes('disabled')).toBeDefined();
    await codeInput(wrapper).setValue('123456');
    expect(verify().attributes('disabled')).toBeUndefined();
    await codeInput(wrapper).trigger('keyup.enter');
    expect(wrapper.emitted('verify')).toEqual([['123456']]);
    await codeInput(wrapper).setValue('654321');
    await codeInput(wrapper).trigger('keyup.enter');
    expect(wrapper.emitted('verify')).toHaveLength(1);
    const cancel = wrapper
      .findAllComponents(NextButton)
      .find(b => b.props('label') === 'MFA_SETTINGS.SETUP.CANCEL');
    expect(cancel.props('disabled')).toBe(true);
    await cancel.vm.$emit('click');
    expect(wrapper.emitted('cancel')).toBeUndefined();

    wrapper.vm.handleVerificationError();
    await flushPromises();
    expect(codeInput(wrapper).attributes('data-message')).toBe(
      'MFA_SETTINGS.SETUP.INVALID_CODE'
    );
    wrapper.vm.handleVerificationError('Code expired');
    await flushPromises();
    expect(codeInput(wrapper).attributes('data-message')).toBe('Code expired');

    await button(wrapper, 'MFA_SETTINGS.SETUP.CANCEL').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(codeInput(wrapper).attributes('data-message')).toBe('');
  });

  it('moves to backup codes only when they arrive for an open, unenabled setup', async () => {
    const wrapper = mountWizard();
    await wrapper.setProps({ backupCodes: [] });
    expect(wrapper.vm.setupStep).toBe('qr');
    await wrapper.setProps({ showSetup: false, backupCodes: ['a'] });
    expect(wrapper.vm.setupStep).toBe('qr');
    await wrapper.setProps({
      showSetup: true,
      mfaEnabled: true,
      backupCodes: ['b'],
    });
    expect(wrapper.vm.setupStep).toBe('qr');
    await wrapper.setProps({ mfaEnabled: false, backupCodes: ['c'] });
    expect(wrapper.vm.setupStep).toBe('backup');
    await wrapper.setProps({ backupCodes: null });
    expect(wrapper.vm.setupStep).toBe('backup');
  });

  it('copies, downloads and confirms backup codes', async () => {
    const wrapper = mountWizard();
    await wrapper.setProps({ backupCodes: ['1111', '2222'] });
    expect(wrapper.findAll('span.font-mono').map(s => s.text())).toEqual([
      '1111',
      '2222',
    ]);

    await button(wrapper, 'MFA_SETTINGS.BACKUP.COPY_ALL').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('1111\n2222');
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.BACKUP.CODES_COPIED');

    const blobs = [];
    URL.createObjectURL = vi.fn(blob => {
      blobs.push(blob);
      return 'blob:codes';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    await button(wrapper, 'MFA_SETTINGS.BACKUP.DOWNLOAD').trigger('click');
    expect(click).toHaveBeenCalled();
    expect(blobs[0].type).toBe('text/plain');
    expect(blobs[0].size).toBeGreaterThan(20);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:codes');

    const complete = () =>
      button(wrapper, 'MFA_SETTINGS.BACKUP.COMPLETE_SETUP');
    expect(complete().attributes('disabled')).toBeDefined();
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await complete().trigger('click');
    expect(wrapper.emitted('complete')).toHaveLength(1);
    expect(wrapper.vm.setupStep).toBe('qr');
  });

  it('resets when the wizard is reopened', async () => {
    const wrapper = mountWizard();
    await wrapper.setProps({ backupCodes: ['1'] });
    await wrapper.setProps({ showSetup: false });
    await wrapper.setProps({ showSetup: true });
    expect(wrapper.vm.setupStep).toBe('qr');
  });
});
