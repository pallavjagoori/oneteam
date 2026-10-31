/**
 * OneTeam behaviour spec for the two-factor management actions.
 *
 * Covers the regenerate and disable cards (and the enforced note that
 * replaces disabling), disabling with an authenticator code or a backup
 * code, regenerating backup codes, the methods the parent calls to
 * reset the forms and show new codes, and copying or downloading the
 * codes.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import MfaManagementActions from '../MfaManagementActions.vue';

const env = vi.hoisted(() => ({ log: [] }));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Dialog = {
  name: 'Dialog',
  props: ['title'],
  emits: ['confirm'],
  methods: {
    open() {
      env.log.push(['open', this.title]);
    },
    close() {
      env.log.push(['close', this.title]);
    },
  },
  template: '<div class="dialog"><slot /></div>',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template: '<input class="field" />',
};
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const mountActions = props =>
  mount(MfaManagementActions, {
    props: { mfaEnabled: true, backupCodes: ['AAA', 'BBB'], ...props },
    global: {
      stubs: { Dialog, Input, Button, Icon: true },
      mocks: { $t: key => key },
    },
  });
const dialog = (wrapper, title) =>
  wrapper.findAllComponents(Dialog).find(d => d.props('title') === title);
const input = (wrapper, label) =>
  wrapper.findAllComponents(Input).find(i => i.props('label') === label);
const button = (wrapper, label) =>
  wrapper.findAllComponents(Button).find(b => b.props('label') === label);

beforeEach(() => {
  env.log = [];
});

describe('MfaManagementActions behaviour', () => {
  it('renders nothing while two-factor is off', () => {
    expect(mountActions({ mfaEnabled: false }).find('div').exists()).toBe(
      false
    );
  });

  it('opens the regenerate and disable dialogs from the cards', async () => {
    const wrapper = mountActions();
    await button(wrapper, 'MFA_SETTINGS.MANAGEMENT.REGENERATE').trigger(
      'click'
    );
    await button(wrapper, 'MFA_SETTINGS.MANAGEMENT.DISABLE_BUTTON').trigger(
      'click'
    );
    expect(env.log).toEqual([
      ['open', 'MFA_SETTINGS.REGENERATE.TITLE'],
      ['open', 'MFA_SETTINGS.DISABLE.TITLE'],
    ]);
  });

  it('replaces the disable card with a note when two-factor is enforced', () => {
    const wrapper = mountActions({ mfaEnforced: true });
    expect(button(wrapper, 'MFA_SETTINGS.MANAGEMENT.DISABLE_BUTTON')).toBe(
      undefined
    );
    expect(wrapper.text()).toContain('MFA_SETTINGS.MANAGEMENT.ENFORCED_NOTE');
  });

  it('disables with the password and an authenticator code', async () => {
    const wrapper = mountActions();
    input(wrapper, 'MFA_SETTINGS.DISABLE.PASSWORD').vm.$emit(
      'update:modelValue',
      'pw'
    );
    input(wrapper, 'MFA_SETTINGS.DISABLE.OTP_CODE').vm.$emit(
      'update:modelValue',
      '123456'
    );
    dialog(wrapper, 'MFA_SETTINGS.DISABLE.TITLE').vm.$emit('confirm');
    expect(wrapper.emitted('disableMfa')[0][0]).toEqual({
      password: 'pw',
      otpCode: '123456',
      backupCode: '',
    });
  });

  it('switches to a backup code and back', async () => {
    const wrapper = mountActions();
    await button(wrapper, 'MFA_SETTINGS.DISABLE.USE_BACKUP_CODE').trigger(
      'click'
    );
    input(wrapper, 'MFA_SETTINGS.DISABLE.BACKUP_CODE').vm.$emit(
      'update:modelValue',
      'ABCD1234'
    );
    dialog(wrapper, 'MFA_SETTINGS.DISABLE.TITLE').vm.$emit('confirm');
    expect(wrapper.emitted('disableMfa')[0][0]).toEqual({
      password: '',
      otpCode: '',
      backupCode: 'ABCD1234',
    });
    await button(wrapper, 'MFA_SETTINGS.DISABLE.USE_OTP_CODE').trigger('click');
    expect(input(wrapper, 'MFA_SETTINGS.DISABLE.OTP_CODE').exists()).toBe(true);
  });

  it('regenerates backup codes with a code', () => {
    const wrapper = mountActions();
    input(wrapper, 'MFA_SETTINGS.REGENERATE.OTP_CODE').vm.$emit(
      'update:modelValue',
      '654321'
    );
    dialog(wrapper, 'MFA_SETTINGS.REGENERATE.TITLE').vm.$emit('confirm');
    expect(wrapper.emitted('regenerateBackupCodes')[0][0]).toEqual({
      otpCode: '654321',
    });
  });

  it('resets the forms, closing their dialogs, for the parent', async () => {
    const wrapper = mountActions();
    await button(wrapper, 'MFA_SETTINGS.DISABLE.USE_BACKUP_CODE').trigger(
      'click'
    );
    input(wrapper, 'MFA_SETTINGS.DISABLE.PASSWORD').vm.$emit(
      'update:modelValue',
      'pw'
    );
    input(wrapper, 'MFA_SETTINGS.REGENERATE.OTP_CODE').vm.$emit(
      'update:modelValue',
      '1'
    );
    wrapper.vm.resetDisableForm();
    wrapper.vm.resetRegenerateForm();
    await flushPromises();
    expect(
      input(wrapper, 'MFA_SETTINGS.DISABLE.PASSWORD').props('modelValue')
    ).toBe('');
    expect(input(wrapper, 'MFA_SETTINGS.DISABLE.OTP_CODE').exists()).toBe(true);
    expect(
      input(wrapper, 'MFA_SETTINGS.REGENERATE.OTP_CODE').props('modelValue')
    ).toBe('');
    expect(env.log).toEqual([
      ['close', 'MFA_SETTINGS.DISABLE.TITLE'],
      ['close', 'MFA_SETTINGS.REGENERATE.TITLE'],
    ]);
  });

  it('shows new codes and closes them once saved', () => {
    const wrapper = mountActions();
    wrapper.vm.showBackupCodesDialog();
    const codes = dialog(wrapper, 'MFA_SETTINGS.REGENERATE.NEW_CODES_TITLE');
    expect(codes.text()).toContain('AAA');
    expect(codes.text()).toContain('BBB');
    codes.vm.$emit('confirm');
    expect(env.log).toEqual([
      ['open', 'MFA_SETTINGS.REGENERATE.NEW_CODES_TITLE'],
      ['close', 'MFA_SETTINGS.REGENERATE.NEW_CODES_TITLE'],
    ]);
  });

  it('copies the codes', async () => {
    const wrapper = mountActions();
    await button(wrapper, 'MFA_SETTINGS.BACKUP.COPY_ALL').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('AAA\nBBB');
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.BACKUP.CODES_COPIED');
  });

  it('downloads the codes as a text file', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:codes');
    URL.revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function record() {
        env.log.push(['download', this.download, this.href]);
      });
    const wrapper = mountActions();
    await button(wrapper, 'MFA_SETTINGS.BACKUP.DOWNLOAD').trigger('click');
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/plain');
    expect(env.log).toEqual([
      ['download', 'chatwoot-backup-codes.txt', 'blob:codes'],
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:codes');
    click.mockRestore();
  });
});
