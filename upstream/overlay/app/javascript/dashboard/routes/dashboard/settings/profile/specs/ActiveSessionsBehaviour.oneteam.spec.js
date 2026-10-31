/**
 * OneTeam behaviour spec for the profile's active sessions list.
 *
 * Covers loading sessions (and the fetch error alert), device icons for
 * phones, tablets and desktops, browser and platform labels (versions,
 * unknown values, the unknown-device fallback), location, last activity
 * with its exact-time tooltip, the current-session badge, and revoking a
 * session with success and error alerts.
 */
import { flushPromises, mount } from '@vue/test-utils';
import authAPI from 'dashboard/api/auth';
import { useAlert } from 'dashboard/composables';
import AnalyticsHelper from 'dashboard/helper/AnalyticsHelper';
import { SESSION_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import ActiveSessions from '../ActiveSessions.vue';

vi.mock('dashboard/api/auth', () => ({
  default: { getSessions: vi.fn(), revokeSession: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/helper/AnalyticsHelper', () => ({
  default: { track: vi.fn() },
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => unix => `exact-${unix}`,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Icon = { name: 'Icon', props: ['icon'], template: '<i class="icon" />' };
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const sessions = [
  {
    id: 1,
    current: true,
    device_name: 'iPhone',
    browser_name: 'Safari',
    browser_version: '17',
    platform_name: 'iOS',
    city: 'Pune',
    country: 'India',
    last_activity_at: '2026-10-31T10:00:00Z',
  },
  {
    id: 2,
    device_name: 'Galaxy Tablet',
    browser_name: 'Chrome',
    platform_name: 'Unknown',
    country: 'India',
  },
  { id: 3, browser_name: 'Unknown Browser', platform_name: 'Linux' },
  { id: 4, device_name: 'Android phone', city: 'Delhi' },
  { id: 5, device_name: 'iPad', browser_name: 'Unknown' },
  { id: 6, device_name: 'Mobile' },
];

const mountList = async () => {
  const wrapper = mount(ActiveSessions, {
    global: {
      stubs: { Icon, Button },
      directives: {
        tooltip: {
          mounted: (el, binding) => {
            el.dataset.tip = binding.value.content;
          },
        },
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};
const rows = wrapper => wrapper.findAll('.rounded-xl');

beforeEach(() => {
  authAPI.getSessions.mockResolvedValue({
    data: sessions.map(s => ({ ...s })),
  });
});

describe('ActiveSessions behaviour', () => {
  it('lists sessions with labels, icons and locations', async () => {
    const wrapper = await mountList();
    const all = rows(wrapper);
    expect(all).toHaveLength(6);
    expect(wrapper.findAllComponents(Icon).map(i => i.props('icon'))).toEqual([
      'i-lucide-smartphone',
      'i-lucide-tablet',
      'i-lucide-monitor',
      'i-lucide-smartphone',
      'i-lucide-tablet',
      'i-lucide-smartphone',
    ]);
    expect(all[0].text()).toContain('Safari 17 on iOS');
    expect(all[0].text()).toContain('Pune, India');
    expect(all[0].text()).toContain(
      'PROFILE_SETTINGS.FORM.SESSIONS_SECTION.CURRENT'
    );
    expect(all[0].find('[data-tip]').attributes('data-tip')).toMatch(
      /^exact-\d+$/
    );
    expect(all[0].text()).toContain('ago');
    expect(all[0].find('button').exists()).toBe(false);
    expect(all[1].text()).toContain('Chrome');
    expect(all[1].text()).not.toContain('Unknown');
    expect(all[2].text()).toContain('Linux');
    expect(all[3].text()).toContain('Delhi');
    expect(all[4].text()).toContain(
      'PROFILE_SETTINGS.FORM.SESSIONS_SECTION.UNKNOWN_DEVICE'
    );
    expect(all[4].find('[data-tip]').exists()).toBe(false);
  });

  it('alerts when sessions cannot be loaded', async () => {
    authAPI.getSessions.mockRejectedValue(new Error('down'));
    const wrapper = await mountList();
    expect(rows(wrapper)).toHaveLength(0);
    expect(useAlert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.FORM.SESSIONS_SECTION.FETCH_ERROR'
    );
  });

  it('revokes a session', async () => {
    authAPI.revokeSession.mockResolvedValue();
    const wrapper = await mountList();
    await rows(wrapper)[1].find('button').trigger('click');
    await flushPromises();
    expect(authAPI.revokeSession).toHaveBeenCalledWith(2);
    expect(rows(wrapper)).toHaveLength(5);
    expect(AnalyticsHelper.track).toHaveBeenCalledWith(
      SESSION_EVENTS.REVOKED_FROM_PROFILE
    );
    expect(useAlert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.FORM.SESSIONS_SECTION.REVOKE_SUCCESS'
    );
  });

  it('keeps the session and alerts when revoking fails', async () => {
    authAPI.revokeSession.mockRejectedValue(new Error('nope'));
    const wrapper = await mountList();
    await rows(wrapper)[1].find('button').trigger('click');
    await flushPromises();
    expect(rows(wrapper)).toHaveLength(6);
    expect(useAlert).toHaveBeenCalledWith(
      'PROFILE_SETTINGS.FORM.SESSIONS_SECTION.REVOKE_ERROR'
    );
  });
});
