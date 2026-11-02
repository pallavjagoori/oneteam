/**
 * OneTeam behaviour spec for the low two-factor backup codes banner.
 *
 * Covers staying hidden when two-factor login is off for the install,
 * off for the user, the code count is unknown, there are enough codes
 * left or the status request fails; the warning and critical (none
 * left) banners; opening the two-factor settings; dismissing; and
 * refreshing when the two-factor state changes.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import mfaAPI from 'dashboard/api/mfa';
import LowBackupCodesBanner from '../LowBackupCodesBanner.vue';

const push = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, n) => (n === undefined ? key : `${key} ${n}`) }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ref(5),
}));
vi.mock('dashboard/api/mfa', () => ({ default: { get: vi.fn() } }));

const status = data => mfaAPI.get.mockResolvedValue({ data });

const mountBanner = async () => {
  const wrapper = mount(LowBackupCodesBanner);
  await flushPromises();
  return wrapper;
};

describe('LowBackupCodesBanner behaviour', () => {
  beforeEach(() => {
    window.chatwootConfig = { isMfaEnabled: 'true' };
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete window.chatwootConfig;
  });

  it('stays hidden when it does not apply', async () => {
    window.chatwootConfig = { isMfaEnabled: 'false' };
    expect((await mountBanner()).html()).not.toContain('i-lucide-triangle');
    expect(mfaAPI.get).not.toHaveBeenCalled();
    delete window.chatwootConfig;
    await mountBanner();
    expect(mfaAPI.get).not.toHaveBeenCalled();

    window.chatwootConfig = { isMfaEnabled: 'true' };
    status({ enabled: false, remaining_backup_codes: 1 });
    expect((await mountBanner()).text()).toBe('');
    status({ enabled: true });
    expect((await mountBanner()).text()).toBe('');
    status({ enabled: true, remaining_backup_codes: 4 });
    expect((await mountBanner()).text()).toBe('');
    mfaAPI.get.mockRejectedValue(new Error('offline'));
    expect((await mountBanner()).text()).toBe('');
  });

  it('warns when few codes are left and opens settings', async () => {
    status({ enabled: true, remaining_backup_codes: 3 });
    const wrapper = await mountBanner();
    expect(wrapper.text()).toContain('MFA_SETTINGS.LOW_BACKUP_CODES.MESSAGE 3');
    expect(wrapper.find('div').classes()).toContain('bg-n-amber-3');
    await wrapper.findAll('button')[0].trigger('click');
    expect(push).toHaveBeenCalledWith({
      name: 'profile_settings_mfa',
      params: { accountId: 5 },
    });
  });

  it('shows a critical banner with no codes left and can be dismissed', async () => {
    status({ enabled: true, remaining_backup_codes: 0 });
    const wrapper = await mountBanner();
    expect(wrapper.text()).toContain('MFA_SETTINGS.LOW_BACKUP_CODES.NONE_LEFT');
    expect(wrapper.find('div').classes()).toContain('bg-n-ruby-3');
    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.text()).toBe('');
  });

  it('refreshes when two-factor settings change', async () => {
    status({ enabled: true, remaining_backup_codes: 10 });
    const wrapper = await mountBanner();
    expect(wrapper.text()).toBe('');
    status({ enabled: true, remaining_backup_codes: 2 });
    emitter.emit(BUS_EVENTS.MFA_STATE_CHANGED);
    await flushPromises();
    expect(wrapper.text()).toContain('MESSAGE 2');

    // Earlier banners in this file are still listening, so compare
    // the number of refreshes before and after unmounting this one.
    mfaAPI.get.mockClear();
    emitter.emit(BUS_EVENTS.MFA_STATE_CHANGED);
    const listening = mfaAPI.get.mock.calls.length;
    wrapper.unmount();
    mfaAPI.get.mockClear();
    emitter.emit(BUS_EVENTS.MFA_STATE_CHANGED);
    expect(mfaAPI.get).toHaveBeenCalledTimes(listening - 1);
  });
});
