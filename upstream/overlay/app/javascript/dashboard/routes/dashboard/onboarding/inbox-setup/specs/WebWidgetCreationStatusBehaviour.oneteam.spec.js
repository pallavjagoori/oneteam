/**
 * OneTeam behaviour spec for the onboarding live chat creation status.
 *
 * Covers polling inboxes until the website inbox appears, then pausing,
 * and the pending and ready labels.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import WebWidgetCreationStatus from '../WebWidgetCreationStatus.vue';

const env = vi.hoisted(() => ({
  poll: null,
  pause: vi.fn(),
  inboxes: null,
  dispatch: vi.fn(),
}));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useTimeoutPoll: fn => {
    env.poll = fn;
    return { pause: env.pause };
  },
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: () => env.inboxes,
}));

const CreationStatusRow = {
  name: 'CreationStatusRow',
  props: { ready: Boolean, status: String },
  template: '<div />',
};

describe('WebWidgetCreationStatus behaviour', () => {
  it('polls until the website inbox exists', async () => {
    env.inboxes = ref([]);
    env.dispatch = vi.fn().mockResolvedValue();
    const wrapper = mount(WebWidgetCreationStatus, {
      global: { stubs: { CreationStatusRow } },
    });
    const row = wrapper.getComponent(CreationStatusRow);
    expect(row.props()).toEqual({
      ready: false,
      status: 'ONBOARDING_INBOX_SETUP.CREATED_FOR_YOU.LIVE_CHAT_STATUS',
    });
    await env.poll();
    expect(env.dispatch).toHaveBeenCalledWith('inboxes/get');
    expect(env.pause).not.toHaveBeenCalled();
    env.inboxes.value = [{ id: 1 }];
    await env.poll();
    await flushPromises();
    expect(env.pause).toHaveBeenCalled();
    expect(row.props()).toEqual({
      ready: true,
      status: 'ONBOARDING_INBOX_SETUP.CREATED_FOR_YOU.LIVE_CHAT_READY',
    });
  });
});
