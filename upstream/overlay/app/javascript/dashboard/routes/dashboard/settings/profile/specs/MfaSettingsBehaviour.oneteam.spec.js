/**
 * OneTeam behaviour spec for the two-factor settings page.
 *
 * Covers redirecting when MFA is off for the installation, loading the
 * current status (and ignoring load failures), starting setup (URI vs
 * URL fields, optional QR URL, start failure), verifying codes with and
 * without returned backup codes, verification errors, cancelling and
 * completing setup, disabling MFA, and regenerating backup codes.
 */
import { flushPromises, mount } from '@vue/test-utils';
import mfaAPI from 'dashboard/api/mfa';
import { useAlert } from 'dashboard/composables';
import { emitter } from 'shared/helpers/mitt';
import MfaSettings from '../MfaSettings.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { accountId: 3 } }),
  useRouter: () => env.router,
}));
vi.mock('dashboard/api/mfa', () => ({
  default: {
    get: vi.fn(),
    enable: vi.fn(),
    verify: vi.fn(),
    disable: vi.fn(),
    regenerateBackupCodes: vi.fn(),
  },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/mitt', () => ({ emitter: { emit: vi.fn() } }));

const Status = {
  name: 'MfaStatusCard',
  props: ['mfaEnabled', 'showSetup'],
  emits: ['enableMfa'],
  template: '<div />',
};
const Wizard = {
  name: 'MfaSetupWizard',
  props: [
    'showSetup',
    'mfaEnabled',
    'provisioningUri',
    'secretKey',
    'backupCodes',
    'qrCodeUrlProp',
  ],
  emits: ['cancel', 'verify', 'complete'],
  methods: { handleVerificationError: msg => env.wizardError(msg) },
  template: '<div />',
};
const Actions = {
  name: 'MfaManagementActions',
  props: ['mfaEnabled', 'mfaEnforced', 'backupCodes'],
  emits: ['disableMfa', 'regenerateBackupCodes'],
  methods: {
    resetDisableForm: () => env.actions.resetDisable(),
    resetRegenerateForm: () => env.actions.resetRegenerate(),
    showBackupCodesDialog: () => env.actions.showCodes(),
  },
  template: '<div />',
};

const mountPage = async () => {
  const wrapper = mount(MfaSettings, {
    global: {
      stubs: {
        MfaStatusCard: Status,
        MfaSetupWizard: Wizard,
        MfaManagementActions: Actions,
        BaseSettingsHeader: true,
      },
      mocks: { $t: key => key },
      config: { errorHandler: error => env.errors.push(error) },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('MfaSettings behaviour', () => {
  beforeEach(() => {
    env.router = { push: vi.fn() };
    env.errors = [];
    env.wizardError = vi.fn();
    env.actions = {
      resetDisable: vi.fn(),
      resetRegenerate: vi.fn(),
      showCodes: vi.fn(),
    };
    window.chatwootConfig = { isMfaEnabled: 'true' };
    mfaAPI.get.mockResolvedValue({
      data: { enabled: true, enforced: true, backup_codes_generated: true },
    });
  });

  it('redirects to profile settings when MFA is off for the installation', async () => {
    window.chatwootConfig = { isMfaEnabled: 'false' };
    await mountPage();
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'profile_settings_index',
      params: { accountId: 3 },
    });
    expect(mfaAPI.get).not.toHaveBeenCalled();
    window.chatwootConfig = undefined;
    await mountPage();
    expect(env.router.push).toHaveBeenCalledTimes(2);
  });

  it('loads the current status and ignores load failures', async () => {
    let wrapper = await mountPage();
    expect(wrapper.findComponent(Actions).props()).toMatchObject({
      mfaEnabled: true,
      mfaEnforced: true,
    });
    mfaAPI.get.mockRejectedValue(new Error('down'));
    wrapper = await mountPage();
    expect(wrapper.findComponent(Actions).props('mfaEnabled')).toBe(false);
  });

  it('starts setup and reports start failures', async () => {
    mfaAPI.get.mockResolvedValue({ data: { enabled: false } });
    const wrapper = await mountPage();
    const wizard = () => wrapper.findComponent(Wizard);
    mfaAPI.enable.mockResolvedValue({
      data: {
        provisioning_uri: 'otpauth://a',
        secret: 'S1',
        qr_code_url: 'https://qr',
      },
    });
    await wrapper.findComponent(Status).vm.$emit('enableMfa');
    await flushPromises();
    expect(wizard().props()).toMatchObject({
      showSetup: true,
      provisioningUri: 'otpauth://a',
      secretKey: 'S1',
      qrCodeUrlProp: 'https://qr',
      backupCodes: [],
    });

    mfaAPI.enable.mockResolvedValue({
      data: { provisioning_url: 'otpauth://b', secret: 'S2' },
    });
    await wrapper.findComponent(Status).vm.$emit('enableMfa');
    await flushPromises();
    expect(wizard().props()).toMatchObject({
      provisioningUri: 'otpauth://b',
      qrCodeUrlProp: 'https://qr',
    });

    await wizard().vm.$emit('cancel');
    expect(wizard().props('showSetup')).toBe(false);

    mfaAPI.enable.mockRejectedValue(new Error('down'));
    await wrapper.findComponent(Status).vm.$emit('enableMfa');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.SETUP.ERROR_STARTING');
  });

  it('verifies codes and completes setup', async () => {
    mfaAPI.get.mockResolvedValue({ data: { enabled: false } });
    const wrapper = await mountPage();
    const wizard = () => wrapper.findComponent(Wizard);
    mfaAPI.verify.mockResolvedValue({ data: { backup_codes: ['1', '2'] } });
    await wizard().vm.$emit('verify', '123456');
    await flushPromises();
    expect(mfaAPI.verify).toHaveBeenCalledWith('123456');
    expect(wizard().props('backupCodes')).toEqual(['1', '2']);
    await wizard().vm.$emit('complete');
    expect(wizard().props('mfaEnabled')).toBe(true);
    expect(emitter.emit).toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.SETUP.SUCCESS');

    useAlert.mockClear();
    mfaAPI.verify.mockResolvedValue({ data: {} });
    await wizard().vm.$emit('verify', '654321');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.SETUP.SUCCESS');
  });

  it('passes verification errors to the wizard and rethrows', async () => {
    const wrapper = await mountPage();
    const wizard = wrapper.findComponent(Wizard);
    mfaAPI.verify.mockRejectedValue({
      response: { data: { error: 'Expired' } },
    });
    await wizard.vm.$emit('verify', '1');
    await flushPromises();
    expect(env.wizardError).toHaveBeenLastCalledWith('Expired');
    mfaAPI.verify.mockRejectedValue(new Error('down'));
    await wizard.vm.$emit('verify', '2');
    await flushPromises();
    expect(env.wizardError).toHaveBeenLastCalledWith(
      'MFA_SETTINGS.SETUP.INVALID_CODE'
    );
    expect(env.errors).toHaveLength(2);
  });

  it('disables MFA and regenerates backup codes', async () => {
    const wrapper = await mountPage();
    const actions = () => wrapper.findComponent(Actions);
    mfaAPI.regenerateBackupCodes.mockResolvedValue({
      data: { backup_codes: ['9'] },
    });
    await actions().vm.$emit('regenerateBackupCodes', { otpCode: '111111' });
    await flushPromises();
    expect(mfaAPI.regenerateBackupCodes).toHaveBeenCalledWith('111111');
    expect(actions().props('backupCodes')).toEqual(['9']);
    expect(env.actions.resetRegenerate).toHaveBeenCalled();
    expect(env.actions.showCodes).toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.REGENERATE.SUCCESS');

    mfaAPI.regenerateBackupCodes.mockRejectedValue(new Error('down'));
    await actions().vm.$emit('regenerateBackupCodes', { otpCode: '1' });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.REGENERATE.ERROR');

    mfaAPI.disable.mockResolvedValue({});
    await actions().vm.$emit('disableMfa', {
      password: 'pw',
      otpCode: '2',
      backupCode: undefined,
    });
    await flushPromises();
    expect(mfaAPI.disable).toHaveBeenCalledWith('pw', {
      otpCode: '2',
      backupCode: undefined,
    });
    expect(actions().props('mfaEnabled')).toBe(false);
    expect(env.actions.resetDisable).toHaveBeenCalled();
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.DISABLE.SUCCESS');

    mfaAPI.disable.mockRejectedValue(new Error('bad'));
    await actions().vm.$emit('disableMfa', { password: 'x' });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('MFA_SETTINGS.DISABLE.ERROR');
  });
});
