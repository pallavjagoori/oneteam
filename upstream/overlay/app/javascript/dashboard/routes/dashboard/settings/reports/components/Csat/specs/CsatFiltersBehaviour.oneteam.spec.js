/**
 * OneTeam behaviour spec for the CSAT report filters.
 *
 * Covers starting from the URL (dates, range and filters) or the last
 * seven days, emitting the filter change and syncing the URL, the add
 * menu (with the optional team filter, hiding filters already in use),
 * active filter chips (names, titles, ratings and unknown ids), removing
 * and clearing filters, the dropdown toggles and date range changes.
 */
import { reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import CsatFilters from '../CsatFilters.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => env.store,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const ActiveChip = {
  name: 'ActiveFilterChip',
  props: ['id', 'name', 'type', 'options', 'activeFilterType', 'showMenu'],
  emits: ['toggleDropdown', 'closeDropdown', 'addFilter', 'removeFilter'],
  template: '<span class="active" />',
};
const AddChip = {
  name: 'AddFilterChip',
  props: ['menuOption', 'showMenu'],
  emits: ['toggleDropdown', 'closeDropdown', 'addFilter'],
  template: '<span class="add" />',
};
const ClearButton = {
  name: 'FilterButton',
  emits: ['click'],
  template: '<button />',
};
const DatePicker = {
  name: 'WootDatePicker',
  props: ['dateRange', 'rangeType'],
  emits: ['dateRangeChanged', 'update:dateRange', 'update:rangeType'],
  template: '<div />',
};

const mountFilters = async ({ query = {}, showTeamFilter = false } = {}) => {
  env.route = { query };
  env.router = { replace: vi.fn() };
  env.store = {
    getters: reactive({
      'agents/getAgents': [{ id: 1, name: 'Ann' }],
      'inboxes/getInboxes': [{ id: 2, name: 'Web' }],
      'teams/getTeams': [{ id: 3, name: 'Sales' }],
    }),
  };
  const wrapper = mount(CsatFilters, {
    props: { showTeamFilter },
    global: {
      stubs: {
        ActiveFilterChip: ActiveChip,
        AddFilterChip: AddChip,
        FilterButton: ClearButton,
        WootDatePicker: DatePicker,
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};

const lastChange = wrapper => wrapper.emitted('filterChange').at(-1)[0];
const chips = wrapper =>
  wrapper
    .findAllComponents(ActiveChip)
    .map(c => [c.props('type'), c.props('name')]);
const menuTypes = wrapper =>
  wrapper
    .findComponent(AddChip)
    .props('menuOption')
    .map(m => m.type);

describe('CSAT filters behaviour', () => {
  it('starts from the last seven days without filters', async () => {
    const wrapper = await mountFilters();
    const change = lastChange(wrapper);
    expect(change.to - change.from).toBeGreaterThan(6 * 86400);
    expect(change).toMatchObject({
      selectedAgents: [],
      selectedInbox: null,
      selectedTeam: null,
      selectedRating: null,
    });
    expect(env.router.replace).toHaveBeenCalledWith({
      query: expect.objectContaining({ range: 'last7days' }),
    });
    expect(menuTypes(wrapper)).toEqual(['agents', 'inboxes', 'ratings']);
    expect(
      wrapper.findComponent(AddChip).props('menuOption')[2].options[0]
    ).toEqual({ id: 1, name: 'CSAT.RATINGS.POOR', type: 'ratings' });
    expect(wrapper.findComponent(ClearButton).exists()).toBe(false);
  });

  it('restores dates and filters from the URL', async () => {
    const wrapper = await mountFilters({
      query: {
        from: '1700000000',
        to: '1700500000',
        range: 'custom',
        agent_id: '1',
        inbox_id: '99',
        team_id: '3',
        rating: '5',
      },
      showTeamFilter: true,
    });
    expect(lastChange(wrapper)).toMatchObject({
      selectedAgents: [{ id: 1 }],
      selectedInbox: { id: 99 },
      selectedTeam: { id: 3 },
      selectedRating: { value: 5 },
    });
    expect(chips(wrapper)).toEqual([
      ['agents', 'Ann'],
      ['inboxes', 'ID: 99'],
      ['teams', 'Sales'],
      ['ratings', 'CSAT.RATINGS.EXCELLENT'],
    ]);
    expect(wrapper.findComponent(AddChip).exists()).toBe(false);
    expect(wrapper.findComponent(ActiveChip).props('options')).toEqual([
      { id: 1, name: 'Ann', type: 'agents' },
    ]);
  });

  it('shows the team filter and falls back to titles', async () => {
    const wrapper = await mountFilters({
      query: { team_id: '3' },
      showTeamFilter: true,
    });
    env.store.getters['teams/getTeams'] = [{ id: 3, title: 'Titled' }];
    await flushPromises();
    expect(chips(wrapper)).toEqual([['teams', 'Titled']]);
    expect(menuTypes(wrapper)).toEqual(['agents', 'inboxes', 'ratings']);
    expect(wrapper.find('.md\\:w-px').exists()).toBe(true);
    const all = await mountFilters({ showTeamFilter: true });
    expect(menuTypes(all)).toEqual(['agents', 'inboxes', 'teams', 'ratings']);
    env.store.getters['teams/getTeams'] = undefined;
    await flushPromises();
    expect(all.findComponent(AddChip).props('menuOption')[2].options).toEqual(
      []
    );
  });

  it('adds, removes and clears filters', async () => {
    const wrapper = await mountFilters();
    await wrapper.findComponent(AddChip).vm.$emit('toggleDropdown');
    expect(wrapper.findComponent(AddChip).props('showMenu')).toBe(true);
    await wrapper
      .findComponent(AddChip)
      .vm.$emit('addFilter', { type: 'inboxes', id: 2 });
    expect(lastChange(wrapper).selectedInbox).toEqual({ id: 2 });
    expect(wrapper.findComponent(AddChip).props('showMenu')).toBe(false);
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: expect.objectContaining({ inbox_id: 2 }),
    });

    const chip = () => wrapper.findComponent(ActiveChip);
    await chip().vm.$emit('toggleDropdown', 'inboxes');
    expect(chip().props()).toMatchObject({
      activeFilterType: 'inboxes',
      showMenu: true,
    });
    await chip().vm.$emit('closeDropdown');
    expect(chip().props()).toMatchObject({
      activeFilterType: '',
      showMenu: false,
    });
    await chip().vm.$emit('removeFilter', 'inboxes');
    expect(lastChange(wrapper).selectedInbox).toBeNull();

    await wrapper
      .findComponent(AddChip)
      .vm.$emit('addFilter', { type: 'agents', id: 1 });
    await wrapper.findComponent(AddChip).vm.$emit('toggleDropdown');
    await wrapper.findComponent(AddChip).vm.$emit('closeDropdown');
    expect(wrapper.findComponent(AddChip).props('showMenu')).toBe(false);
    await wrapper.findComponent(ClearButton).vm.$emit('click');
    expect(lastChange(wrapper).selectedAgents).toEqual([]);
    expect(wrapper.findComponent(ActiveChip).exists()).toBe(false);
  });

  it('emits new date ranges', async () => {
    const wrapper = await mountFilters();
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 10);
    await wrapper
      .findComponent(DatePicker)
      .vm.$emit('dateRangeChanged', [start, end, 'last30days']);
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: expect.objectContaining({ range: 'last30days' }),
    });
    await wrapper
      .findComponent(DatePicker)
      .vm.$emit('dateRangeChanged', [start, end]);
    expect(env.router.replace).toHaveBeenLastCalledWith({
      query: expect.objectContaining({ range: 'custom' }),
    });
    await wrapper
      .findComponent(DatePicker)
      .vm.$emit('update:dateRange', [start, end]);
    await wrapper
      .findComponent(DatePicker)
      .vm.$emit('update:rangeType', 'custom');
    expect(wrapper.findComponent(DatePicker).props('rangeType')).toBe('custom');
    expect(lastChange(wrapper).from).toBe(Math.floor(start.getTime() / 1000));
  });
});
