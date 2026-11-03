/**
 * Covers the paused state icon of a monitor row.
 */
import { shallowMount } from '@vue/test-utils';
import MonitorListItem from '../MonitorListItem.vue';

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountScopedRoute: name => ({ name }) }),
}));

describe('MonitorListItem paused state', () => {
  it('shows the pause icon and paused label', () => {
    const wrapper = shallowMount(MonitorListItem, {
      props: {
        monitor: {
          id: 3,
          name: 'Refunds',
          condition: 'Mentions refunds',
          recent_count: 0,
          paused_at: '2026-11-01T00:00:00Z',
        },
      },
      global: {
        stubs: {
          Label: {
            props: ['label'],
            template:
              '<span class="state">{{ label }}<slot name="icon" /></span>',
          },
          Icon: { props: ['icon'], template: '<i :class="icon" />' },
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    });
    expect(wrapper.find('.state').text()).toContain('MONITORS.STATES.PAUSED');
    expect(wrapper.find('.i-ph-pause').exists()).toBe(true);
  });
});
