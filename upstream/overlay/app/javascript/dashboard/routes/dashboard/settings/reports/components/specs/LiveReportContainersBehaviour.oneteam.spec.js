/**
 * OneTeam behaviour spec for the live agent and team conversation tables
 * on the overview report.
 *
 * Covers loading the list and metrics on mount, starting live refresh,
 * refreshing metrics, and passing data and loading state to the table.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import AgentLiveReportContainer from '../AgentLiveReportContainer.vue';
import TeamLiveReportContainer from '../TeamLiveReportContainer.vue';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  start: vi.fn(),
  refetch: null,
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: name =>
    computed(
      () =>
        ({
          getOverviewUIFlags: {
            isFetchingAgentConversationMetric: true,
            isFetchingTeamConversationMetric: false,
          },
          getAgentConversationMetric: [{ id: 1 }],
          'agents/getAgents': [{ id: 1, name: 'Ann' }],
          getTeamConversationMetric: [{ id: 2 }],
          'teams/getTeams': [{ id: 2, name: 'Support' }],
        })[name]
    ),
}));
vi.mock('dashboard/composables/useLiveRefresh', () => ({
  useLiveRefresh: fn => {
    env.refetch = fn;
    return { startRefetching: env.start };
  },
}));

const MetricCard = {
  name: 'MetricCard',
  props: ['header'],
  template: '<section><slot /></section>',
};
const AgentTable = {
  name: 'AgentTable',
  props: ['agents', 'agentMetrics', 'isLoading'],
  template: '<table />',
};
const TeamTable = {
  name: 'TeamTable',
  props: ['teams', 'teamMetrics', 'isLoading'],
  template: '<table />',
};

/**
 * Mounts a container.
 *
 * @param {object} component Container to mount.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountContainer = component => {
  env.dispatch.mockClear();
  env.start.mockClear();
  return mount(component, {
    global: {
      stubs: { MetricCard, AgentTable, TeamTable },
      mocks: { $t: key => key },
    },
  });
};

describe('live report containers behaviour', () => {
  it('loads and refreshes agent conversations', () => {
    const wrapper = mountContainer(AgentLiveReportContainer);
    expect(env.dispatch.mock.calls).toEqual([
      ['agents/get'],
      ['fetchAgentConversationMetric'],
    ]);
    expect(env.start).toHaveBeenCalledTimes(1);
    env.refetch();
    expect(env.dispatch).toHaveBeenLastCalledWith(
      'fetchAgentConversationMetric'
    );
    expect(wrapper.getComponent(MetricCard).props('header')).toBe(
      'OVERVIEW_REPORTS.AGENT_CONVERSATIONS.HEADER'
    );
    expect(wrapper.getComponent(AgentTable).props()).toEqual({
      agents: [{ id: 1, name: 'Ann' }],
      agentMetrics: [{ id: 1 }],
      isLoading: true,
    });
  });

  it('loads and refreshes team conversations', () => {
    const wrapper = mountContainer(TeamLiveReportContainer);
    expect(env.dispatch.mock.calls).toEqual([
      ['teams/get'],
      ['fetchTeamConversationMetric'],
    ]);
    env.refetch();
    expect(env.dispatch).toHaveBeenLastCalledWith(
      'fetchTeamConversationMetric'
    );
    expect(wrapper.getComponent(TeamTable).props()).toEqual({
      teams: [{ id: 2, name: 'Support' }],
      teamMetrics: [{ id: 2 }],
      isLoading: false,
    });
  });
});
