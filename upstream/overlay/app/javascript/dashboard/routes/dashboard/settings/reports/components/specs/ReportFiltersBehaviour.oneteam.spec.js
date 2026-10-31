/**
 * OneTeam behaviour spec for the report filter bar.
 *
 * Covers the initial emit (defaults and values restored from the URL),
 * each entity type's options, labels and placeholders, picking another
 * entity (route change, agents as a list), date ranges and the group-by
 * options they allow (week/month/year, falling back when the current
 * grouping is not allowed), the group-by dropdown, business hours, and
 * hiding group-by, entity and business-hours controls.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ReportFilters from '../ReportFilters.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => env.store,
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));

const Chip = {
  name: 'ActiveFilterChip',
  props: [
    'id',
    'name',
    'type',
    'options',
    'activeFilterType',
    'showMenu',
    'placeholder',
  ],
  emits: ['toggleDropdown', 'closeDropdown', 'addFilter', 'removeFilter'],
  template: '<div class="chip" />',
};
const Picker = {
  name: 'WootDatePicker',
  emits: ['dateRangeChanged', 'update:dateRange', 'update:rangeType'],
  template: '<div />',
};
const Toggle = {
  name: 'ToggleSwitch',
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: '<span class="toggle" />',
};

const day = n => new Date(2026, 0, 1 + n);

const mountFilters = ({
  props = {},
  query = {},
  params = {},
  getters = {},
} = {}) => {
  env.route = reactive({ query, params: { accountId: 1, ...params } });
  env.router = { replace: vi.fn(), push: vi.fn() };
  env.store = {
    getters: {
      'teams/getTeams': [{ id: 1, name: 'Sales' }],
      'inboxes/getInboxes': [{ id: 2, name: 'Web' }],
      'labels/getLabels': [{ id: 3, title: 'vip' }],
      'agents/getAgents': [{ id: 4, name: 'Ana' }],
      ...getters,
    },
  };
  return mount(ReportFilters, {
    props,
    global: {
      stubs: {
        ActiveFilterChip: Chip,
        WootDatePicker: Picker,
        ToggleSwitch: Toggle,
      },
    },
  });
};

const entityChip = wrapper =>
  wrapper.findAllComponents(Chip).find(c => c.props('type') !== 'groupBy');
const groupChip = wrapper =>
  wrapper.findAllComponents(Chip).find(c => c.props('type') === 'groupBy');
const lastEmit = wrapper => wrapper.emitted('filterChange').at(-1)[0];
const pickRange = async (wrapper, days, type) => {
  await wrapper
    .findComponent(Picker)
    .vm.$emit('dateRangeChanged', [day(0), day(days), type]);
  await flushPromises();
};

describe('ReportFilters behaviour', () => {
  it('emits defaults on mount', async () => {
    const wrapper = mountFilters({ props: { filterType: 'teams' } });
    await flushPromises();
    expect(lastEmit(wrapper)).toMatchObject({
      businessHours: false,
      groupBy: { id: 1, period: 'day' },
    });
    expect(lastEmit(wrapper).teams).toBeUndefined();
    expect(env.router.replace).toHaveBeenCalled();
    expect(entityChip(wrapper).props()).toMatchObject({
      name: 'TEAM_REPORTS.FILTER_DROPDOWN_LABEL',
      placeholder: 'TEAM_REPORTS.FILTERS.INPUT_PLACEHOLDER.TEAMS',
      options: [{ id: 1, name: 'Sales', type: 'teams' }],
    });
    expect(groupChip(wrapper)).toBeUndefined();
  });

  it('restores filters from the URL and route', async () => {
    const from = Math.floor(day(0).getTime() / 1000);
    const to = Math.floor(day(100).getTime() / 1000);
    const wrapper = mountFilters({
      props: { filterType: 'inboxes', selectedItem: { id: 2 } },
      query: {
        from: String(from),
        to: String(to),
        business_hours: 'true',
        group_by: '3',
        range: 'custom',
      },
      params: { id: '2' },
    });
    await flushPromises();
    expect(lastEmit(wrapper)).toMatchObject({
      businessHours: true,
      groupBy: { id: 3 },
      inboxes: { id: 2 },
    });
    expect(entityChip(wrapper).props('name')).toBe('Web');
    expect(
      groupChip(wrapper)
        .props('options')
        .map(o => o.id)
    ).toEqual([1, 2, 3]);
    expect(groupChip(wrapper).props('name')).toBe(
      'REPORT.GROUPING_OPTIONS.MONTH'
    );

    const unknownGroup = mountFilters({
      props: { filterType: 'inboxes', selectedItem: { id: 99 } },
      query: { group_by: '9' },
    });
    await flushPromises();
    expect(lastEmit(unknownGroup).groupBy).toEqual({ id: 1, period: 'day' });
    expect(entityChip(unknownGroup).props('name')).toBe(
      'INBOX_REPORTS.FILTER_DROPDOWN_LABEL'
    );
  });

  it('labels each entity type', async () => {
    const labels = mountFilters({ props: { filterType: 'labels' } });
    expect(entityChip(labels).props('options')).toEqual([
      { id: 3, name: 'vip', type: 'labels' },
    ]);
    expect(entityChip(labels).props('placeholder')).toBe(
      'LABEL_REPORTS.FILTERS.INPUT_PLACEHOLDER.LABELS'
    );
    const agents = mountFilters({ props: { filterType: 'agents' } });
    expect(entityChip(agents).props('name')).toBe(
      'AGENT_REPORTS.FILTER_DROPDOWN_LABEL'
    );
    const none = mountFilters();
    expect(entityChip(none).props()).toMatchObject({
      name: 'FORMS.MULTISELECT.SELECT_ONE',
      placeholder: '',
      options: [],
    });
    const missing = mountFilters({
      props: { filterType: 'teams' },
      getters: { 'teams/getTeams': {} },
    });
    expect(entityChip(missing).props('options')).toEqual([]);
  });

  it('switches to another entity', async () => {
    const wrapper = mountFilters({
      props: { filterType: 'agents' },
      query: { range: 'x' },
    });
    await flushPromises();
    const chip = entityChip(wrapper);
    await chip.vm.$emit('toggleDropdown', 'agents');
    expect(entityChip(wrapper).props()).toMatchObject({
      showMenu: true,
      activeFilterType: 'agents',
    });
    await chip.vm.$emit('closeDropdown');
    expect(entityChip(wrapper).props('showMenu')).toBe(false);
    await chip.vm.$emit('addFilter', { id: 4 });
    expect(lastEmit(wrapper).agents).toEqual([{ id: 4 }]);
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'agent_reports_show',
      params: { accountId: 1, id: 4 },
      query: { range: 'x' },
    });
    expect(entityChip(wrapper).props('name')).toBe('Ana');

    const plain = mountFilters();
    await entityChip(plain).vm.$emit('addFilter', { id: 1 });
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('offers groupings that fit the date range', async () => {
    const wrapper = mountFilters({ props: { filterType: 'teams' } });
    await flushPromises();
    await pickRange(wrapper, 40, 'last_month');
    expect(
      groupChip(wrapper)
        .props('options')
        .map(o => o.id)
    ).toEqual([1, 2]);
    await pickRange(wrapper, 400);
    expect(
      groupChip(wrapper)
        .props('options')
        .map(o => o.id)
    ).toEqual([2, 3, 4]);
    expect(lastEmit(wrapper).groupBy).toEqual({ id: 2, period: 'week' });

    await groupChip(wrapper).vm.$emit('toggleDropdown');
    expect(groupChip(wrapper).props()).toMatchObject({
      showMenu: true,
      activeFilterType: 'groupBy',
    });
    await groupChip(wrapper).vm.$emit('closeDropdown');
    expect(groupChip(wrapper).props('activeFilterType')).toBe('');
    await groupChip(wrapper).vm.$emit('toggleDropdown');
    await entityChip(wrapper).vm.$emit('toggleDropdown', 'teams');
    expect(groupChip(wrapper).props('showMenu')).toBe(false);
    await groupChip(wrapper).vm.$emit('addFilter', { id: 4 });
    expect(lastEmit(wrapper).groupBy).toEqual({ id: 4, period: 'year' });
    await groupChip(wrapper).vm.$emit('removeFilter');

    await pickRange(wrapper, 5);
    expect(groupChip(wrapper)).toBeUndefined();
    expect(lastEmit(wrapper).groupBy).toEqual({ id: 1, period: 'day' });
  });

  it('labels an unknown grouping with the placeholder', async () => {
    const wrapper = mountFilters({ props: { filterType: 'teams' } });
    await pickRange(wrapper, 400);
    await groupChip(wrapper).vm.$emit('addFilter', { id: 1 });
    expect(groupChip(wrapper).props('name')).toBe(
      'REPORT.GROUP_BY_FILTER_DROPDOWN_LABEL'
    );
  });

  it('toggles business hours', async () => {
    const wrapper = mountFilters();
    await wrapper.findComponent(Toggle).vm.$emit('update:modelValue', true);
    await wrapper.findComponent(Toggle).vm.$emit('change');
    expect(lastEmit(wrapper).businessHours).toBe(true);
  });

  it('hides optional controls', async () => {
    const wrapper = mountFilters({
      props: {
        showGroupBy: false,
        showBusinessHours: false,
        showEntityFilter: false,
        filterType: 'teams',
      },
      params: { id: '1' },
    });
    await flushPromises();
    await pickRange(wrapper, 400);
    expect(wrapper.findAllComponents(Chip)).toHaveLength(0);
    expect(wrapper.findComponent(Toggle).exists()).toBe(false);
    expect(lastEmit(wrapper).groupBy).toBeUndefined();
    expect(lastEmit(wrapper).teams).toBeUndefined();
  });
});
