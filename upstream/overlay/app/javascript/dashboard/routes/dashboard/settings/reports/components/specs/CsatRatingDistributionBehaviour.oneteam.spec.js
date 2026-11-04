/**
 * OneTeam behaviour spec for the CSAT report CsatRatingDistribution.
 *
 * Covers the loading skeleton, the empty bar, and the chart segments
 * sorted from the best rating down with missing counts as zero.
 */
import { mount } from '@vue/test-utils';
import CsatRatingDistribution from '../CsatRatingDistribution.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const ChartStub = {
  name: 'PercentageChart',
  props: ['data'],
  template:
    '<div class="chart"><slot name="legend-item" label="Great" formatted-percentage="50%" formatted-value="2" /></div>',
};

/**
 * Mounts the distribution.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountDistribution = props =>
  mount(CsatRatingDistribution, {
    props,
    global: {
      mocks: { $t: key => key },
      stubs: { PercentageChart: ChartStub },
    },
  });

describe('CsatRatingDistribution behaviour', () => {
  it('shows the loading skeleton', () => {
    const wrapper = mountDistribution({ isLoading: true });
    expect(wrapper.findAll('.animate-pulse')).toHaveLength(6);
  });

  it('shows an empty bar without responses', () => {
    const wrapper = mountDistribution({});
    expect(wrapper.find('.chart').exists()).toBe(false);
    expect(wrapper.find('.bg-n-alpha-2').exists()).toBe(true);
  });

  it('builds sorted segments and renders legend items', () => {
    const wrapper = mountDistribution({
      totalResponseCount: 4,
      ratingCount: { 5: 2, 1: 2 },
    });
    const { data } = wrapper.findComponent(ChartStub).props();
    expect(data.total).toBe(4);
    const values = data.segments.map(segment => segment.value);
    expect(values[0]).toBe(2);
    expect(values[values.length - 1]).toBe(2);
    expect(values.slice(1, -1).every(value => value === 0)).toBe(true);
    expect(wrapper.text()).toContain('Great');
    expect(wrapper.text()).toContain('50%');
    expect(wrapper.text()).toContain('(2)');
  });
});
