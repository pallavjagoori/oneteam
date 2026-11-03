/**
 * OneTeam behaviour spec for a Captain document's sync status.
 *
 * Covers syncing, stale syncing, failed (known and unknown error codes),
 * synced (fresh and past the stale threshold) and never-synced states:
 * their labels, tooltip text, tone, icon or spinner, and the retry button.
 */
import { mount } from '@vue/test-utils';
import DocumentSyncStatus from '../DocumentSyncStatus.vue';

vi.mock('shared/helpers/timeHelper', () => ({ dynamicTime: () => 'ago' }));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => () => 'exact',
}));

let tip;
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const mountStatus = props =>
  mount(DocumentSyncStatus, {
    props,
    global: {
      stubs: {
        Button,
        Spinner: { template: '<b class="spinner" />' },
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
      },
      directives: {
        tooltip: {
          mounted: (el, binding) => {
            tip = binding.value.content;
          },
        },
      },
    },
  });

describe('DocumentSyncStatus behaviour', () => {
  it('shows a running sync', () => {
    const wrapper = mountStatus({ status: 'syncing', syncInProgress: true });
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.classes()).toContain('text-n-amber-11');
    expect(wrapper.text()).toBe('CAPTAIN.DOCUMENTS.SYNC_STATUS.SYNCING');
    expect(tip).toBe('CAPTAIN.DOCUMENTS.SYNC_STATUS.SYNCING');
  });

  it('offers a retry for a stalled sync', async () => {
    const wrapper = mountStatus({ status: 'syncing', showRetry: true });
    expect(wrapper.text()).toContain(
      'CAPTAIN.DOCUMENTS.SYNC_STATUS.STALE_SYNC'
    );
    expect(tip).toBe('CAPTAIN.DOCUMENTS.SYNC_STATUS.STALE_SYNC');
    expect(wrapper.classes()).toContain('text-n-amber-11');
    expect(wrapper.find('.i-lucide-circle-alert').exists()).toBe(true);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('shows failures with known and unknown error codes', () => {
    const wrapper = mountStatus({ status: 'failed', errorCode: 'timeout' });
    expect(wrapper.classes()).toContain('text-n-ruby-11');
    expect(wrapper.text()).toBe('CAPTAIN.DOCUMENTS.SYNC_STATUS.FAILED');
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.vm.errorLabel).toBe('CAPTAIN.DOCUMENTS.SYNC_ERRORS.TIMEOUT');
    expect(
      mountStatus({ status: 'failed', errorCode: 'odd' }).vm.errorLabel
    ).toBe('CAPTAIN.DOCUMENTS.SYNC_ERRORS.DEFAULT');
  });

  it('shows synced, stale and never-synced documents', () => {
    const now = Date.now() / 1000;
    const fresh = mountStatus({ lastSyncedAt: now, staleAfterHours: 24 });
    expect(fresh.text()).toBe('CAPTAIN.DOCUMENTS.SYNC_STATUS.SYNCED');
    expect(tip).toBe('CAPTAIN.DOCUMENTS.SYNC_STATUS.SYNCED');
    expect(fresh.classes()).toContain('text-n-slate-11');
    expect(fresh.find('.i-lucide-refresh-cw').exists()).toBe(true);

    const stale = mountStatus({
      lastSyncedAt: now - 7200,
      staleAfterHours: 1,
    });
    expect(stale.classes()).toContain('text-n-amber-11');
    expect(stale.find('.i-lucide-circle-alert').exists()).toBe(true);

    const never = mountStatus({ staleAfterHours: 1, showRetry: true });
    expect(never.text()).toBe('CAPTAIN.DOCUMENTS.SYNC_STATUS.NEVER_SYNCED');
    expect(tip).toBe('CAPTAIN.DOCUMENTS.SYNC_STATUS.NEVER_SYNCED');
    expect(never.classes()).toContain('text-n-slate-11');
    expect(never.find('button').exists()).toBe(false);
  });
});
