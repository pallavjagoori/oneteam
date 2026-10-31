/**
 * OneTeam behaviour spec for the live overview stats (conversations and
 * agent status).
 *
 * Covers fetching metrics and starting live refresh on mount, the
 * loading flag, labelled conversation and agent metrics, the team
 * filter (hidden without teams, toggled open, outside clicks, filtering
 * by a team, back to all teams, unknown team label).
 */
import { computed, reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import StatsLiveReportsContainer from '../StatsLiveReportsContainer.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.state[name]),
}));
vi.mock('dashboard/composables/useLiveRefresh', () => ({
  useLiveRefresh: fn => {
    env.refetch = fn;
    return { startRefetching: env.startRefetching };
  },
}));
vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useToggle: initial => {
    const state = ref(!!initial);
    return [
      state,
      value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      },
    ];
  },
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const MetricCard = {
  name: 'MetricCard',
  props: ['header', 'isLoading'],
  template: '<section class="card"><slot name="control" /><slot /></section>',
};
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template:
    '<button class="team" @click="$emit(\'click\')">{{ label }}</button>',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems'],
  emits: ['action'],
  template: '<div class="menu" />',
};

const mountStats = async ({
  teams = [{ id: 4, name: 'sales' }],
  isFetching = false,
} = {}) => {
  env.store = { dispatch: vi.fn() };
  env.startRefetching = vi.fn();
  env.state = reactive({
    getOverviewUIFlags: { isFetchingAccountConversationMetric: isFetching },
    'agents/getAgentStatus': { online: 3, busy: 1, offline: 2 },
    getAccountConversationMetric: { open: 10, unattended: 2 },
    'teams/getTeams': teams,
  });
  const wrapper = mount(StatsLiveReportsContainer, {
    global: {
      stubs: { MetricCard, Button, DropdownMenu },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
      mocks: { $t: key => key },
    },
  });
  await flushPromises();
  return wrapper;
};
const cards = wrapper => wrapper.findAllComponents(MetricCard);
const metrics = card =>
  card.findAll('.pb-2').map(m => [m.find('h3').text(), m.find('p').text()]);

describe('StatsLiveReportsContainer behaviour', () => {
  it('fetches metrics and starts live refresh', async () => {
    await mountStats();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'fetchAccountConversationMetric',
      {}
    );
    expect(env.startRefetching).toHaveBeenCalled();
    env.refetch();
    expect(env.store.dispatch).toHaveBeenCalledTimes(2);
  });

  it('labels conversation and agent metrics', async () => {
    const wrapper = await mountStats({ isFetching: true });
    const [conversations, agents] = cards(wrapper);
    expect(conversations.props()).toEqual({
      header: 'OVERVIEW_REPORTS.ACCOUNT_CONVERSATIONS.HEADER',
      isLoading: true,
    });
    expect(metrics(conversations)).toEqual([
      ['OVERVIEW_REPORTS.ACCOUNT_CONVERSATIONS.OPEN', '10'],
      ['OVERVIEW_REPORTS.ACCOUNT_CONVERSATIONS.UNATTENDED', '2'],
    ]);
    expect(metrics(agents)).toEqual([
      ['OVERVIEW_REPORTS.AGENT_STATUS.ONLINE', '3'],
      ['OVERVIEW_REPORTS.AGENT_STATUS.BUSY', '1'],
      ['OVERVIEW_REPORTS.AGENT_STATUS.OFFLINE', '2'],
    ]);
  });

  it('hides the team filter without teams', async () => {
    const wrapper = await mountStats({ teams: [] });
    expect(wrapper.find('.team').exists()).toBe(false);
  });

  it('filters by team and back to all teams', async () => {
    const wrapper = await mountStats();
    expect(wrapper.find('.team').text()).toBe(
      'OVERVIEW_REPORTS.TEAM_CONVERSATIONS.ALL_TEAMS'
    );
    await wrapper.find('.team').trigger('click');
    const menu = wrapper.findComponent(DropdownMenu);
    expect(menu.props('menuItems')).toEqual([
      { label: 'OVERVIEW_REPORTS.TEAM_CONVERSATIONS.ALL_TEAMS', value: null },
      { label: 'sales', value: 4 },
    ]);
    menu.vm.$emit('action', { value: 4 });
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenLastCalledWith(
      'fetchAccountConversationMetric',
      { team_id: 4 }
    );
    expect(wrapper.find('.team').text()).toBe('sales');
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);

    await wrapper.find('.team').trigger('click');
    wrapper.findComponent(DropdownMenu).vm.$emit('action', { value: null });
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenLastCalledWith(
      'fetchAccountConversationMetric',
      {}
    );
  });

  it('closes the menu on outside clicks and blanks unknown teams', async () => {
    const wrapper = await mountStats();
    await wrapper.find('.team').trigger('click');
    env.clickaway();
    await flushPromises();
    expect(wrapper.findComponent(DropdownMenu).exists()).toBe(false);
    await wrapper.find('.team').trigger('click');
    wrapper.findComponent(DropdownMenu).vm.$emit('action', { value: 99 });
    await flushPromises();
    expect(wrapper.find('.team').text()).toBe('');
  });
});
