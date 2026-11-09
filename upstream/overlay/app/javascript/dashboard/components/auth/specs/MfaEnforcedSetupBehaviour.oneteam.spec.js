/**
 * OneTeam behaviour spec for the enforced MFA setup screen.
 *
 * Covers finishing straight away when no backup codes come back,
 * finishing after the backup codes step, ignoring completion before
 * verifying, the error fallback, and cancelling.
 */
import axios from 'axios';
import { flushPromises, mount } from '@vue/test-utils';
import { setAuthCredentials } from 'dashboard/store/utils/api';
import MfaEnforcedSetup from '../MfaEnforcedSetup.vue';

const env = vi.hoisted(() => ({ handleVerificationError: vi.fn() }));

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/store/utils/api', () => ({
  parseAPIErrorResponse: () => '',
  setAuthCredentials: vi.fn(),
}));

/**
 * Mounts the setup screen.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountSetup = () =>
  mount(MfaEnforcedSetup, {
    props: {
      mfaSetupToken: 'tok',
      provisioningUrl: 'otpauth://x',
      secret: 'S',
    },
    global: {
      mocks: { $t: key => key },
      stubs: {
        MfaSetupWizard: {
          name: 'MfaSetupWizard',
          props: ['backupCodes'],
          emits: ['verify', 'complete', 'cancel'],
          methods: { handleVerificationError: env.handleVerificationError },
          template: '<div />',
        },
      },
    },
  });

const wizard = wrapper => wrapper.findComponent({ name: 'MfaSetupWizard' });

describe('MfaEnforcedSetup behaviour', () => {
  it('finishes at once without backup codes', async () => {
    axios.post.mockResolvedValue({ data: { id: 1 } });
    const wrapper = mountSetup();
    wizard(wrapper).vm.$emit('complete');
    expect(setAuthCredentials).not.toHaveBeenCalled();

    wizard(wrapper).vm.$emit('verify', '123456');
    await flushPromises();
    expect(axios.post).toHaveBeenCalledWith('/auth/sign_in', {
      mfa_setup_token: 'tok',
      otp_code: '123456',
    });
    expect(wrapper.emitted('verified')).toEqual([[{ id: 1 }]]);
  });

  it('waits for the backup codes step before finishing', async () => {
    axios.post.mockResolvedValue({ data: { id: 2, backup_codes: ['a', 'b'] } });
    const wrapper = mountSetup();
    wizard(wrapper).vm.$emit('verify', '123456');
    await flushPromises();
    expect(wizard(wrapper).props('backupCodes')).toEqual(['a', 'b']);
    expect(wrapper.emitted('verified')).toBeUndefined();
    wizard(wrapper).vm.$emit('complete');
    expect(wrapper.emitted('verified')).toHaveLength(1);
  });

  it('shows the invalid code fallback and cancels', async () => {
    axios.post.mockRejectedValue(new Error('bad'));
    const wrapper = mountSetup();
    wizard(wrapper).vm.$emit('verify', '000000');
    await flushPromises();
    expect(env.handleVerificationError).toHaveBeenCalledWith(
      'MFA_SETTINGS.SETUP.INVALID_CODE'
    );
    wizard(wrapper).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
