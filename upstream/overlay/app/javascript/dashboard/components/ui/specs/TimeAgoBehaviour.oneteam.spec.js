/**
 * OneTeam behaviour spec for the conversation list time stamp.
 *
 * Covers the short "created • last activity" text and its exact-time
 * tooltip, following timestamp changes, refreshing every minute, hour or
 * day depending on how old the last activity is, resetting when the row
 * shows another conversation, and not refreshing when auto refresh is
 * off.
 */
import { mount } from '@vue/test-utils';
import TimeAgo from '../TimeAgo.vue';

const env = vi.hoisted(() => ({ calls: 0 }));

vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: time => {
    env.calls += 1;
    return `${time}#${env.calls}`;
  },
  shortTimestamp: text => `s${text}`,
}));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => time => `exact${time}`,
}));

const NOW = 1_700_000_000_000;
const MINUTE = 60_000;
const tooltips = [];

const mountTime = props =>
  mount(TimeAgo, {
    props: { createdAtTimestamp: 100, conversationId: 1, ...props },
    global: {
      directives: {
        tooltip: {
          mounted: (el, binding) => tooltips.push(binding.value.content),
          updated: (el, binding) => tooltips.push(binding.value.content),
        },
      },
    },
  });

const text = wrapper => wrapper.find('span').text();

describe('TimeAgo behaviour', () => {
  beforeEach(() => {
    env.calls = 0;
    tooltips.length = 0;
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows both times with an exact-time tooltip', () => {
    const wrapper = mountTime({ lastActivityTimestamp: 200 });
    expect(text(wrapper)).toBe('s100#2 • s200#1');
    expect(tooltips[0]).toBe(
      'CHAT_LIST.CHAT_TIME_STAMP.CREATED.OLDEST exact100\nCHAT_LIST.CHAT_TIME_STAMP.LAST_ACTIVITY.NOT_ACTIVE exact200'
    );
    wrapper.unmount();
  });

  it('follows timestamp changes', async () => {
    const wrapper = mountTime({ lastActivityTimestamp: 200 });
    await wrapper.setProps({ lastActivityTimestamp: 300 });
    expect(text(wrapper)).toBe('s100#2 • s300#3');
    await wrapper.setProps({ createdAtTimestamp: 150 });
    expect(text(wrapper)).toBe('s150#4 • s300#3');
    wrapper.unmount();
  });

  it.each([
    ['a recent', NOW / 1000 - 30, MINUTE],
    ['an hours-old', NOW / 1000 - 2 * 3600, 60 * MINUTE],
    ['a days-old', NOW / 1000 - 3 * 86400, 24 * 60 * MINUTE],
  ])('refreshes %s activity on the right interval', async (_, last, wait) => {
    const wrapper = mountTime({ lastActivityTimestamp: last });
    expect(wrapper.vm.refreshTime()).toBe(wait);
    vi.advanceTimersByTime(wait - 1);
    expect(env.calls).toBe(2);
    vi.advanceTimersByTime(1);
    await wrapper.vm.$nextTick();
    expect(env.calls).toBe(4);
    expect(text(wrapper)).toContain('#4');
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resets when the row shows another conversation', async () => {
    const wrapper = mountTime({ lastActivityTimestamp: NOW / 1000 });
    vi.advanceTimersByTime(MINUTE / 2);
    await wrapper.setProps({ conversationId: 2 });
    expect(text(wrapper)).toBe(`s100#4 • s${NOW / 1000}#3`);
    vi.advanceTimersByTime(MINUTE / 2);
    expect(env.calls).toBe(4);
    vi.advanceTimersByTime(MINUTE / 2);
    expect(env.calls).toBe(6);
    wrapper.unmount();
  });

  it('does not refresh when auto refresh is off', async () => {
    const wrapper = mountTime({
      lastActivityTimestamp: 200,
      isAutoRefreshEnabled: false,
    });
    expect(vi.getTimerCount()).toBe(0);
    await wrapper.setProps({ conversationId: 2 });
    expect(vi.getTimerCount()).toBe(0);
    expect(env.calls).toBe(4);
  });
});
