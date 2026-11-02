/**
 * OneTeam behaviour spec for the Captain overview summary card.
 *
 * Covers the greeting, the loading skeleton, the empty summary, stepping
 * through summary points (wrapping both ways) and rotating them every 15
 * seconds, restarting at the first point when points change, no
 * controls or rotation for a single point, featured and regular metric
 * cards (not clickable while loading), and metric clicks.
 */
import { mount } from '@vue/test-utils';
import OverviewSummaryCard from '../OverviewSummaryCard.vue';

const MetricCard = {
  name: 'MetricCard',
  props: {
    label: String,
    clickable: Boolean,
    loading: Boolean,
    layout: String,
  },
  emits: ['click'],
  template: '<div class="metric" @click="$emit(\'click\')">{{ label }}</div>',
};

const mountCard = props =>
  mount(OverviewSummaryCard, {
    props: { userName: 'Ann', ...props },
    global: {
      stubs: { MetricCard, Icon: true },
      directives: { tooltip: {} },
    },
  });

const point = wrapper => wrapper.find('[aria-live="polite"]').text();
const arrows = wrapper => wrapper.findAll('button');

describe('OverviewSummaryCard behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('greets the user and shows loading or empty states', () => {
    const loading = mountCard({ summaryLoading: true, points: ['a', 'b'] });
    expect(loading.text()).toContain('CAPTAIN.OVERVIEW.V2.SUMMARY.GREETING');
    expect(
      loading.find('[aria-label="CAPTAIN.OVERVIEW.WELCOME.LOADING"]').exists()
    ).toBe(true);
    expect(arrows(loading)).toHaveLength(0);

    const empty = mountCard();
    expect(empty.text()).toContain('CAPTAIN.OVERVIEW.V2.SUMMARY.EMPTY');
    expect(empty.vm.activePoint).toBe('');
    empty.vm.movePoint(1);
    expect(empty.vm.activePointIndex).toBe(0);
  });

  it('steps through and rotates the summary points', async () => {
    const wrapper = mountCard({ points: ['one', 'two', 'three'] });
    expect(point(wrapper)).toBe('one');
    await arrows(wrapper)[0].trigger('click');
    expect(point(wrapper)).toBe('three');
    await arrows(wrapper)[1].trigger('click');
    await arrows(wrapper)[1].trigger('click');
    expect(point(wrapper)).toBe('two');

    vi.advanceTimersByTime(15000);
    await wrapper.vm.$nextTick();
    expect(point(wrapper)).toBe('three');

    await wrapper.setProps({ points: ['new', 'newer'] });
    expect(point(wrapper)).toBe('new');
    vi.advanceTimersByTime(15000);
    await wrapper.vm.$nextTick();
    expect(point(wrapper)).toBe('newer');

    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows a single point without controls or rotation', async () => {
    const wrapper = mountCard({ points: ['only'] });
    expect(point(wrapper)).toBe('only');
    expect(arrows(wrapper)).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    wrapper.vm.activePointIndex = 5;
    await wrapper.vm.$nextTick();
    expect(point(wrapper)).toBe('only');
  });

  it('shows metric cards and reports clicks', async () => {
    const featured = [{ key: 'f', label: 'Handled', clickable: true }];
    const metrics = [
      { key: 'a', label: 'Resolved', clickable: true },
      { key: 'b', label: 'Handoffs', clickable: false },
    ];
    const wrapper = mountCard({ featuredMetrics: featured, metrics });
    const cards = wrapper.findAllComponents(MetricCard);
    expect(cards.map(c => [c.props('label'), c.props('clickable')])).toEqual([
      ['Handled', true],
      ['Resolved', true],
      ['Handoffs', false],
    ]);
    expect(cards[0].props('layout')).toBe('headline');
    await cards[0].trigger('click');
    await cards[2].trigger('click');
    expect(wrapper.emitted('metricClick')).toEqual([
      [featured[0]],
      [metrics[1]],
    ]);

    await wrapper.setProps({ loading: true });
    expect(
      wrapper.findAllComponents(MetricCard).map(c => c.props('clickable'))
    ).toEqual([false, false, false]);
  });
});
