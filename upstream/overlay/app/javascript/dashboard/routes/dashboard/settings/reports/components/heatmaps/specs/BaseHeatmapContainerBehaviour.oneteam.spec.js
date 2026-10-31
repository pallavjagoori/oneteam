/**
 * OneTeam behaviour spec for the reports heatmap container.
 *
 * Covers fetching when a range or inbox is picked, the live-refresh
 * callback (relative presets re-anchored to "now"), the inbox filter
 * dropdown, value formatting for both heatmap kinds and the CSV / backend
 * download paths.
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import BaseHeatmapContainer from '../BaseHeatmapContainer.vue';

const env = vi.hoisted(() => ({}));

// @vueuse/core resolves its own copy of Vue under pnpm, so its refs are not
// tracked by this component's computeds; use an app-Vue toggle instead.
vi.mock('@vueuse/core', async importOriginal => {
  const { ref } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: (initial = false) => {
      const value = ref(initial);
      const toggle = next => {
        value.value = typeof next === 'boolean' ? next : !value.value;
        return value.value;
      };
      return [value, toggle];
    },
  };
});
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, arg) =>
      arg === undefined ? key : `${key}:${JSON.stringify(arg)}`,
  }),
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  const getters = {
    getOverviewUIFlags: () => env.state.uiFlags,
    'inboxes/getInboxes': () => env.state.inboxes,
    getHeatmap: () => env.state.heatmap,
  };
  return {
    useMapGetter: key => computed(getters[key]),
    useStore: () => env.store,
  };
});
vi.mock('dashboard/composables/useLiveRefresh', () => ({
  useLiveRefresh: fn => {
    env.refetch = fn;
    return { startRefetching: env.startRefetching };
  },
}));
vi.mock('dashboard/helper/downloadHelper', () => ({
  downloadCsvFile: vi.fn(),
}));

const { downloadCsvFile } = await import('dashboard/helper/downloadHelper');

const Selector = {
  name: 'HeatmapDateRangeSelector',
  props: ['from', 'to', 'daysNum'],
  emits: [
    'update:from',
    'update:to',
    'update:daysNum',
    'rangeTypeChange',
    'monthOffsetChange',
  ],
  template: '<div />',
};
const Heatmap = {
  name: 'BaseHeatmap',
  props: [
    'heatmapData',
    'numberOfRows',
    'isLoading',
    'colorScheme',
    'ariaLabel',
    'formatValue',
  ],
  template: '<div />',
};
const ButtonStub = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};

const mountContainer = (props = {}) =>
  mount(BaseHeatmapContainer, {
    props: {
      metric: 'conversations_count',
      title: 'Conversations',
      downloadTitle: 'conversation_heatmap',
      storeGetter: 'getHeatmap',
      storeAction: 'fetchHeatmap',
      uiFlagKey: 'isFetchingHeatmap',
      ...props,
    },
    global: {
      directives: {
        onClickaway: {
          mounted: (_, binding) => {
            env.clickaway = binding.value;
          },
        },
        tooltip: {},
      },
      stubs: {
        MetricCard: {
          props: ['header'],
          template: '<div><slot name="control" /><slot /></div>',
        },
        HeatmapDateRangeSelector: Selector,
        BaseHeatmap: Heatmap,
        Button: ButtonStub,
        DropdownMenu: {
          name: 'DropdownMenu',
          props: ['menuItems', 'searchPlaceholder'],
          emits: ['action'],
          template: '<ul class="menu" />',
        },
      },
    },
  });

const selector = wrapper => wrapper.findComponent(Selector);
const pickRange = async (wrapper, from, to, days = null) => {
  selector(wrapper).vm.$emit('update:daysNum', days);
  selector(wrapper).vm.$emit('update:from', from);
  selector(wrapper).vm.$emit('update:to', to);
  await flushPromises();
};
const download = wrapper =>
  wrapper.find('[data-icon="i-lucide-download"]').trigger('click');
const lastFetch = () => env.store.dispatch.mock.lastCall;

const NOW = new Date(2026, 9, 15, 10, 30);
const unix = date => Math.floor(date.getTime() / 1000);

describe('BaseHeatmapContainer behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    env.state = reactive({
      uiFlags: { isFetchingHeatmap: false },
      inboxes: [
        { id: 1, name: 'Web Chat' },
        { id: 2, name: 'Mail & Co' },
      ],
      heatmap: [],
    });
    env.store = { dispatch: vi.fn() };
    env.startRefetching = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads inboxes and starts live refresh on mount', () => {
    const wrapper = mountContainer();
    expect(env.store.dispatch).toHaveBeenCalledWith('inboxes/get');
    expect(env.startRefetching).toHaveBeenCalled();
    const heatmap = wrapper.findComponent(Heatmap);
    expect(heatmap.props()).toMatchObject({
      numberOfRows: 0,
      isLoading: false,
      colorScheme: 'blue',
      ariaLabel:
        'OVERVIEW_REPORTS.HEATMAP_ARIA_LABEL:{"metric":"Conversations"}',
    });
  });

  it('does not fetch without a range or while loading', async () => {
    const wrapper = mountContainer();
    env.store.dispatch.mockClear();
    env.refetch();
    expect(env.store.dispatch).not.toHaveBeenCalled();

    env.state.uiFlags.isFetchingHeatmap = true;
    await pickRange(wrapper, new Date(2026, 9, 1), new Date(2026, 9, 7));
    expect(env.store.dispatch).not.toHaveBeenCalled();
    expect(wrapper.findComponent(Heatmap).props('numberOfRows')).toBe(7);
  });

  it('fetches a fixed range when both ends are picked', async () => {
    const wrapper = mountContainer();
    const from = new Date(2026, 8, 1);
    const to = new Date(2026, 8, 3, 23, 59, 59);
    selector(wrapper).vm.$emit('update:from', from);
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledTimes(1);
    selector(wrapper).vm.$emit('update:to', to);
    await flushPromises();
    expect(lastFetch()).toEqual([
      'fetchHeatmap',
      {
        metric: 'conversations_count',
        from: unix(from),
        to: unix(to),
        groupBy: 'hour',
        businessHours: false,
      },
    ]);
  });

  it('re-anchors a "last N days" preset to now on refresh', async () => {
    const wrapper = mountContainer();
    await pickRange(wrapper, new Date(2026, 0, 1), new Date(2026, 0, 7), '6');
    const to = new Date(2026, 9, 15, 23, 59, 59, 999);
    expect(lastFetch()[1]).toMatchObject({
      from: unix(new Date(2026, 9, 9)),
      to: unix(to),
    });
  });

  it('re-anchors the current month and keeps past months fixed', async () => {
    const wrapper = mountContainer();
    selector(wrapper).vm.$emit('rangeTypeChange', 'month');
    await pickRange(wrapper, new Date(2026, 9, 1), new Date(2026, 9, 31), 6);
    expect(lastFetch()[1]).toMatchObject({
      from: unix(new Date(2026, 9, 1)),
      to: unix(new Date(2026, 9, 15, 23, 59, 59, 999)),
    });

    selector(wrapper).vm.$emit('monthOffsetChange', -1);
    const from = new Date(2026, 8, 1);
    const to = new Date(2026, 8, 30);
    await pickRange(wrapper, from, to, 6);
    expect(lastFetch()[1]).toMatchObject({ from: unix(from), to: unix(to) });

    selector(wrapper).vm.$emit('rangeTypeChange', 'week');
    env.refetch();
    expect(lastFetch()[1].from).toBe(unix(new Date(2026, 9, 9)));
  });

  it('filters by inbox through the dropdown', async () => {
    const wrapper = mountContainer();
    const filterButton = () => wrapper.findAll('button')[0];
    expect(filterButton().text()).toBe('INBOX_REPORTS.ALL_INBOXES');
    expect(wrapper.find('.menu').exists()).toBe(false);

    await filterButton().trigger('click');
    const menu = wrapper.findComponent({ name: 'DropdownMenu' });
    expect(menu.props('menuItems')).toEqual([
      {
        label: 'INBOX_REPORTS.ALL_INBOXES',
        value: null,
        action: 'select_inbox',
      },
      { label: 'Web Chat', value: 1, action: 'select_inbox' },
      { label: 'Mail & Co', value: 2, action: 'select_inbox' },
    ]);
    env.clickaway();
    await flushPromises();
    expect(wrapper.find('.menu').exists()).toBe(false);

    // Picking an inbox without a range does not fetch yet.
    await filterButton().trigger('click');
    env.store.dispatch.mockClear();
    wrapper.findComponent({ name: 'DropdownMenu' }).vm.$emit('action', {
      value: 2,
    });
    await flushPromises();
    expect(filterButton().text()).toBe('Mail & Co');
    expect(wrapper.find('.menu').exists()).toBe(false);
    expect(env.store.dispatch).not.toHaveBeenCalled();

    await pickRange(wrapper, new Date(2026, 9, 1), new Date(2026, 9, 2));
    expect(lastFetch()[1]).toMatchObject({ type: 'inbox', id: 2 });

    await filterButton().trigger('click');
    wrapper.findComponent({ name: 'DropdownMenu' }).vm.$emit('action', {
      value: null,
    });
    await flushPromises();
    expect(filterButton().text()).toBe('INBOX_REPORTS.ALL_INBOXES');
    expect(lastFetch()[1].type).toBeUndefined();
  });

  it.each([
    ['conversations_count', 'CONVERSATION_HEATMAP'],
    ['resolutions_count', 'RESOLUTION_HEATMAP'],
  ])('formats %s values', (metric, key) => {
    const wrapper = mountContainer({ metric });
    const format = wrapper.findComponent(Heatmap).props('formatValue');
    expect(format(0)).toBe(`OVERVIEW_REPORTS.${key}.NO_CONVERSATIONS`);
    expect(format(1)).toBe(`OVERVIEW_REPORTS.${key}.CONVERSATION:{"count":1}`);
    expect(format(3)).toBe(`OVERVIEW_REPORTS.${key}.CONVERSATIONS:{"count":3}`);
  });

  describe('download', () => {
    it('does nothing without a range', async () => {
      const wrapper = mountContainer({ downloadAction: 'downloadHeatmap' });
      env.store.dispatch.mockClear();
      await download(wrapper);
      expect(env.store.dispatch).not.toHaveBeenCalled();
      expect(downloadCsvFile).not.toHaveBeenCalled();
    });

    it('uses the backend export for all inboxes on day presets', async () => {
      const wrapper = mountContainer({ downloadAction: 'downloadHeatmap' });
      await pickRange(wrapper, new Date(2026, 9, 9), new Date(2026, 9, 15), 6);
      await download(wrapper);
      expect(lastFetch()).toEqual([
        'downloadHeatmap',
        {
          daysBefore: 6,
          to: unix(new Date(2026, 9, 15, 23, 59, 59, 999)),
        },
      ]);
      expect(downloadCsvFile).not.toHaveBeenCalled();
    });

    it('skips the CSV when there is no data', async () => {
      const wrapper = mountContainer();
      await pickRange(wrapper, new Date(2026, 9, 1), new Date(2026, 9, 2));
      await download(wrapper);
      env.state.heatmap = null;
      await download(wrapper);
      expect(downloadCsvFile).not.toHaveBeenCalled();
    });

    it('builds a CSV from store data, naming the inbox', async () => {
      env.state.heatmap = [
        { timestamp: unix(new Date(2026, 9, 1, 9)), value: 4 },
        { timestamp: unix(new Date(2026, 9, 1, 13)), value: 0 },
      ];
      const wrapper = mountContainer({ downloadAction: 'downloadHeatmap' });
      await wrapper.findAll('button')[0].trigger('click');
      wrapper.findComponent({ name: 'DropdownMenu' }).vm.$emit('action', {
        value: 2,
      });
      await pickRange(wrapper, new Date(2026, 9, 1), new Date(2026, 9, 2));
      await download(wrapper);
      expect(downloadCsvFile).toHaveBeenCalledWith(
        'conversation_heatmap_Mail___Co_15-10-2026.csv',
        'Date,Hour,Conversations\n2026-10-01,9:00 - 10:00,4\n2026-10-01,13:00 - 14:00,0'
      );
    });

    it('builds a CSV without an inbox suffix for month ranges', async () => {
      env.state.heatmap = [
        { timestamp: unix(new Date(2026, 9, 2, 0)), value: 1 },
      ];
      const wrapper = mountContainer({ downloadAction: 'downloadHeatmap' });
      selector(wrapper).vm.$emit('rangeTypeChange', 'month');
      await pickRange(wrapper, new Date(2026, 9, 1), new Date(2026, 9, 31));
      await download(wrapper);
      expect(downloadCsvFile.mock.lastCall[0]).toBe(
        'conversation_heatmap_15-10-2026.csv'
      );
    });
  });
});
