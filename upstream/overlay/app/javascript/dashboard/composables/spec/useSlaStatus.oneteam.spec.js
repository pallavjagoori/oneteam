import { defineComponent, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { evaluateSLAStatus } from 'dashboard/helper/slaHelper';
import { useSlaStatus } from '../useSlaStatus';

/*
 * OneTeam coverage for when useSlaStatus re-evaluates: on SLA event changes
 * (in either key style) and with no SLA, chat or events given at all.
 */
vi.mock('dashboard/helper/slaHelper', () => ({
  evaluateSLAStatus: vi.fn(() => ({ threshold: '1m' })),
  shouldRefreshSLAStatus: () => false,
}));

const mountWith = args =>
  mount(
    defineComponent({
      setup() {
        useSlaStatus(args);
        return () => null;
      },
    })
  );

describe('useSlaStatus (OneTeam)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('works without an SLA, chat or events', () => {
    mountWith({}).unmount();
    expect(evaluateSLAStatus).toHaveBeenCalledWith({
      appliedSla: undefined,
      chat: undefined,
      slaEvents: [],
    });
  });

  it('re-evaluates when an SLA event is added in either key style', async () => {
    const slaEvents = ref([{ event_type: 'frt', created_at: 1 }]);
    const wrapper = mountWith({
      appliedSla: ref({}),
      chat: ref({}),
      slaEvents,
    });
    slaEvents.value = [...slaEvents.value, { eventType: 'nrt', createdAt: 2 }];
    await nextTick();
    expect(evaluateSLAStatus).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
