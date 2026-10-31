/**
 * OneTeam behaviour spec for the SLA report filters.
 *
 * Covers starting without filters (no change emitted), restoring
 * filters from the URL (keeping the date range), the add menu hiding
 * filters in use and hiding entirely when all are used, chips with
 * names and label titles, adding (labels by title), removing and
 * clearing filters, and the dropdown toggles.
 */
import { flushPromises, mount } from '@vue/test-utils';
import SLAFilter from '../SLAFilter.vue';

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
  template: '<span />',
};
const AddChip = {
  name: 'AddFilterChip',
  props: ['menuOption', 'showMenu'],
  emits: ['toggleDropdown', 'closeDropdown', 'addFilter'],
  template: '<span />',
};
const ClearButton = {
  name: 'FilterButton',
  emits: ['click'],
  template: '<button />',
};

const mountFilter = async (query = {}) => {
  env.route = { query };
  env.router = { replace: vi.fn() };
  env.store = {
    getters: {
      'agents/getAgents': [{ id: 1, name: 'Ann' }],
      'inboxes/getInboxes': [{ id: 2, name: 'Web' }],
      'teams/getTeams': [{ id: 3, name: 'Sales' }],
      'labels/getLabels': [{ id: 4, title: 'vip' }],
      'sla/getSLA': [{ id: 5, name: 'Gold' }],
    },
  };
  const wrapper = mount(SLAFilter, {
    global: {
      stubs: {
        ActiveFilterChip: ActiveChip,
        AddFilterChip: AddChip,
        FilterButton: ClearButton,
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};

const chips = wrapper =>
  wrapper
    .findAllComponents(ActiveChip)
    .map(c => [c.props('type'), c.props('name')]);
const addChip = wrapper => wrapper.findComponent(AddChip);

describe('SLA filter behaviour', () => {
  it('starts without filters', async () => {
    const wrapper = await mountFilter();
    expect(wrapper.emitted('filterChange')).toBeUndefined();
    expect(
      addChip(wrapper)
        .props('menuOption')
        .map(m => m.type)
    ).toEqual(['sla', 'inboxes', 'agents', 'teams', 'labels']);
    expect(addChip(wrapper).props('menuOption')[4].options).toEqual([
      { id: 4, name: 'vip', type: 'labels' },
    ]);
    expect(wrapper.findComponent(ClearButton).exists()).toBe(false);
  });

  it('restores every filter from the URL', async () => {
    const wrapper = await mountFilter({
      from: '100',
      to: '200',
      range: 'custom',
      agent_id: '1',
      inbox_id: '2',
      team_id: '3',
      sla_policy_id: '5',
      label: 'vip',
    });
    expect(wrapper.emitted('filterChange')[0][0]).toEqual({
      assigned_agent_id: 1,
      inbox_id: 2,
      team_id: 3,
      sla_policy_id: 5,
      label_list: 'vip',
    });
    expect(env.router.replace).toHaveBeenCalledWith({
      query: expect.objectContaining({
        from: '100',
        to: '200',
        agent_id: 1,
        label: 'vip',
      }),
    });
    expect(chips(wrapper)).toEqual([
      ['agents', 'Ann'],
      ['inboxes', 'Web'],
      ['teams', 'Sales'],
      ['sla', 'Gold'],
      ['labels', 'vip'],
    ]);
    expect(addChip(wrapper).exists()).toBe(false);
    expect(wrapper.find('.md\\:w-px').exists()).toBe(false);
  });

  it('adds, removes and clears filters', async () => {
    const wrapper = await mountFilter();
    await addChip(wrapper).vm.$emit('toggleDropdown');
    expect(addChip(wrapper).props('showMenu')).toBe(true);
    await addChip(wrapper).vm.$emit('addFilter', {
      type: 'labels',
      id: 4,
      name: 'vip',
    });
    expect(wrapper.emitted('filterChange').at(-1)[0]).toMatchObject({
      label_list: 'vip',
    });
    expect(addChip(wrapper).props('showMenu')).toBe(false);
    await addChip(wrapper).vm.$emit('addFilter', {
      type: 'sla',
      id: 5,
      name: 'Gold',
    });
    expect(chips(wrapper)).toEqual([
      ['sla', 'Gold'],
      ['labels', 'vip'],
    ]);
    expect(wrapper.find('.md\\:w-px').exists()).toBe(true);

    const chip = () => wrapper.findAllComponents(ActiveChip)[0];
    await chip().vm.$emit('toggleDropdown', 'sla');
    expect(chip().props()).toMatchObject({
      activeFilterType: 'sla',
      showMenu: true,
    });
    await chip().vm.$emit('closeDropdown');
    expect(chip().props()).toMatchObject({
      activeFilterType: '',
      showMenu: false,
    });
    await chip().vm.$emit('removeFilter', 'sla');
    expect(wrapper.emitted('filterChange').at(-1)[0].sla_policy_id).toBeNull();

    await addChip(wrapper).vm.$emit('toggleDropdown');
    await addChip(wrapper).vm.$emit('closeDropdown');
    expect(addChip(wrapper).props('showMenu')).toBe(false);
    await wrapper.findComponent(ClearButton).vm.$emit('click');
    expect(wrapper.emitted('filterChange').at(-1)[0]).toEqual({
      assigned_agent_id: null,
      inbox_id: null,
      team_id: null,
      sla_policy_id: null,
      label_list: null,
    });
    expect(wrapper.findComponent(ActiveChip).exists()).toBe(false);
  });
});
