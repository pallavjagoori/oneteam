/**
 * OneTeam behaviour spec for the base report heatmap.
 *
 * Covers the loading skeleton, building chart rows per day with hourly
 * cells, and the blue and green colour schemes.
 */
import { mount } from '@vue/test-utils';
import BaseHeatmap from '../BaseHeatmap.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('@chatwoot/viz', () => ({
  HeatmapChart: {
    name: 'HeatmapChart',
    props: ['data', 'colors', 'quantiles'],
    template: '<div class="chart" />',
  },
}));

/**
 * Mounts the heatmap.
 *
 * @param {object} props extra props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountHeatmap = props =>
  mount(BaseHeatmap, {
    props: { ariaLabel: 'Heatmap', formatValue: value => value, ...props },
  });

describe('BaseHeatmap behaviour', () => {
  it('renders the loading skeleton', () => {
    const wrapper = mountHeatmap({ isLoading: true, numberOfRows: 2 });
    expect(wrapper.find('.chart').exists()).toBe(false);
    expect(
      wrapper.findAll('.grid-cols-\\[repeat\\(24\\,_1fr\\)\\]')
    ).toHaveLength(3);
  });

  it('builds a row per day with hourly cells in blue', () => {
    const base = new Date(2026, 0, 4, 0, 0, 0).getTime() / 1000;
    const wrapper = mountHeatmap({
      heatmapData: [
        { timestamp: base + 3600, value: 3 },
        { timestamp: base + 86400 + 7200, value: 5 },
      ],
    });
    const chart = wrapper.findComponent({ name: 'HeatmapChart' });
    const { rows, columns } = chart.props('data');
    expect(columns[9].label).toBe('09:00');
    expect(rows.map(row => row.label)).toEqual([
      'DAYS_OF_WEEK.SUNDAY',
      'DAYS_OF_WEEK.MONDAY',
    ]);
    expect(rows[0].description).toBe('Jan 4, 2026');
    expect(rows[0].data[1].value).toBe(3);
    expect(rows[0].data[0]).toBeNull();
    expect(chart.props('colors')[0]).toBe('rgb(var(--blue-3))');
    expect(chart.classes()).toContain(
      '[--cw-viz-heatmap-focus-color:rgb(var(--blue-9))]'
    );
  });

  it('uses the green scheme', () => {
    const chart = mountHeatmap({ colorScheme: 'green' }).findComponent({
      name: 'HeatmapChart',
    });
    expect(chart.props('colors')[0]).toBe('rgb(var(--teal-3))');
    expect(chart.classes()).toContain(
      '[--cw-viz-heatmap-focus-color:rgb(var(--teal-9))]'
    );
    expect(chart.props('data').rows).toEqual([]);
  });
});
