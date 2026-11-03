/**
 * OneTeam behaviour spec for the WhatsApp campaign delivery breakdown.
 *
 * Covers the loading bar, the chart and rate for a non-empty audience, the
 * empty bar, and the derived segment counts.
 */
import { mount } from '@vue/test-utils';
import CampaignDeliveryBreakdown from '../CampaignDeliveryBreakdown.vue';

const env = vi.hoisted(() => ({ chart: null }));

vi.mock('@chatwoot/viz', () => ({
  PercentageChart: {
    name: 'PercentageChart',
    props: ['data'],
    setup(props) {
      env.chart = props;
    },
    template: '<div class="chart" />',
  },
}));

/**
 * Mounts the breakdown with the given props.
 *
 * @param {object} props - Component props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBreakdown = props => mount(CampaignDeliveryBreakdown, { props });

describe('CampaignDeliveryBreakdown behaviour', () => {
  it('shows a pulse while loading', () => {
    const wrapper = mountBreakdown({ loading: true });
    expect(wrapper.find('.animate-pulse').exists()).toBe(true);
    expect(wrapper.find('.chart').exists()).toBe(false);
  });

  it('charts the segments for an audience', () => {
    const wrapper = mountBreakdown({
      metrics: { audience: 10, read: 2, delivered: 6, failed: 1, skipped: 1 },
    });
    expect(wrapper.find('.chart').exists()).toBe(true);
    expect(env.chart.data.total).toBe(10);
    expect(env.chart.data.segments.map(s => [s.id, s.value])).toEqual([
      ['read', 2],
      ['delivered', 4],
      ['failed', 1],
      ['skipped', 1],
      ['pending', 2],
    ]);
  });

  it('shows an empty bar without an audience', () => {
    const wrapper = mountBreakdown({ metrics: null });
    expect(wrapper.find('.chart').exists()).toBe(false);
    expect(wrapper.find('.bg-n-alpha-2').exists()).toBe(true);
  });
});
