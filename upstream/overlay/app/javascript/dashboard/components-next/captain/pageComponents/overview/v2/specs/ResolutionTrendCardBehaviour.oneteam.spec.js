/**
 * OneTeam behaviour spec for the Captain overview resolution trend card.
 *
 * Covers the loading skeleton and empty states, the conversation count
 * line chart (bucket labels for single days, same-month and cross-month
 * ranges), switching to the resolution rate bar chart through the measure
 * dropdown (with and without a previous-period comparison and its hint),
 * value formatting, and closing the dropdown on an outside click.
 */
import { mount } from '@vue/test-utils';
import ResolutionTrendCard from '../ResolutionTrendCard.vue';

const env = vi.hoisted(() => ({ outside: null }));

vi.mock('@chatwoot/viz', () => ({
  LineChart: {
    name: 'LineChart',
    props: ['data', 'formatValue'],
    template: '<div class="line" />',
  },
  BarChart: {
    name: 'BarChart',
    props: ['data', 'formatValue'],
    template: '<div class="bar" />',
  },
}));
vi.mock('@vueuse/core', async importOriginal => {
  const { ref } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = ref(false);
      return [
        state,
        value => {
          state.value = typeof value === 'boolean' ? value : !state.value;
        },
      ];
    },
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, b) => {
      env.outside = b.value;
    },
  },
}));

const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<ul class="menu" />',
};

const buckets = [
  {
    starts_on: '2026-01-05',
    ends_on: '2026-01-11',
    conversations_handled: 1200,
    resolved_by_captain: 900,
    current_resolution_rate: 75,
    previous_resolution_rate: 60,
    previous_starts_on: '2025-12-29',
    previous_ends_on: '2026-01-04',
  },
  {
    starts_on: '2026-01-26',
    ends_on: '2026-02-01',
    conversations_handled: 10,
    resolved_by_captain: 5,
    current_resolution_rate: null,
    previous_resolution_rate: null,
    previous_starts_on: '2026-01-19',
    previous_ends_on: '2026-01-19',
  },
  {
    starts_on: '2026-02-02',
    ends_on: '2026-02-02',
    conversations_handled: 3,
    resolved_by_captain: 1,
    current_resolution_rate: 33.333,
    previous_starts_on: '2026-01-26',
    previous_ends_on: '2026-01-26',
  },
];

const mountCard = props =>
  mount(ResolutionTrendCard, {
    props,
    global: {
      stubs: {
        OverviewPanel: {
          template: '<div><slot name="actions" /><slot /></div>',
        },
        MetricHint: { template: '<i class="hint" />' },
        DropdownMenu,
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });
const pickMeasure = async (wrapper, value) => {
  await wrapper.find('button').trigger('click');
  await wrapper.findComponent(DropdownMenu).vm.$emit('action', { value });
  await wrapper.vm.$nextTick();
};

describe('ResolutionTrendCard behaviour', () => {
  it('shows a skeleton while loading and the empty state without data', () => {
    expect(mountCard({ loading: true }).find('.animate-pulse').exists()).toBe(
      true
    );
    const empty = mountCard();
    expect(empty.text()).toContain('CAPTAIN.OVERVIEW.V2.EMPTY');
    expect(empty.find('button').text()).toBe(
      'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.CONVERSATION_COUNT'
    );
  });

  it('plots handled and resolved conversations', () => {
    const wrapper = mountCard({ trend: { buckets } });
    const chart = wrapper.findComponent({ name: 'LineChart' });
    const { categories, series } = chart.props('data');
    expect(categories).toEqual(['Jan 05 - 11', 'Jan 26 - Feb 01', 'Feb 02']);
    expect(series.map(s => s.data)).toEqual([
      [1200, 10, 3],
      [900, 5, 1],
    ]);
    expect(chart.props('formatValue')(1200)).toBe((1200).toLocaleString());
  });

  it('switches to resolution rates with a comparison', async () => {
    const wrapper = mountCard({ trend: { buckets } });
    await pickMeasure(wrapper, 'resolution_rate');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    expect(wrapper.find('button').text()).toBe(
      'CAPTAIN.OVERVIEW.V2.RESOLUTION_TREND.RESOLUTION_RATE'
    );
    expect(wrapper.find('.hint').exists()).toBe(true);
    const chart = wrapper.findComponent({ name: 'BarChart' });
    const [current, previous] = chart.props('data').series;
    expect(current.data.map(p => p.value)).toEqual([75, undefined, 33.333]);
    expect(current.data[0].description).toBe('Mon, Jan 5 - Sun, Jan 11');
    expect(current.data[2].description).toBe('Mon, Feb 2');
    expect(previous.data.map(p => p.value)).toEqual([60, undefined, undefined]);
    expect(previous.data[1].description).toBe('Mon, Jan 19');
    expect(chart.props('formatValue')(33.333)).toBe('33.3%');
  });

  it('shows rates without a comparison and the empty state without rates', async () => {
    const current = buckets.map(
      ({ previous_resolution_rate: _, ...rest }) => rest
    );
    const wrapper = mountCard({ trend: { buckets: current } });
    await pickMeasure(wrapper, 'resolution_rate');
    expect(wrapper.find('.hint').exists()).toBe(false);
    expect(
      wrapper.findComponent({ name: 'BarChart' }).props('data').series
    ).toHaveLength(1);

    const noRates = mountCard({ trend: { buckets: [{ ...buckets[1] }] } });
    await pickMeasure(noRates, 'resolution_rate');
    expect(noRates.text()).toContain('CAPTAIN.OVERVIEW.V2.EMPTY');
  });

  it('closes the measure dropdown on an outside click', async () => {
    const wrapper = mountCard();
    await wrapper.find('button').trigger('click');
    expect(
      wrapper.findComponent(DropdownMenu).props('menuItems')[0].isSelected
    ).toBe(true);
    env.outside();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
  });

  it('labels the dropdown blank for an unknown measure', async () => {
    const wrapper = mountCard();
    await pickMeasure(wrapper, 'unknown');
    expect(wrapper.find('button').text()).toBe('');
  });
});
