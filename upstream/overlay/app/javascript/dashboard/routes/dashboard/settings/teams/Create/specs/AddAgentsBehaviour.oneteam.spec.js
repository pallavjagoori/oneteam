/**
 * OneTeam behaviour spec for the "add agents" step of team creation.
 *
 * Covers loading agents, the header naming the team, picking agents
 * through the agent selector (touching validation), the empty-selection
 * error, selecting all agents, and saving members with a redirect to
 * the finish step and a teams reload, or an error alert.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import router from 'dashboard/routes/index';
import AddAgents from '../AddAgents.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/routes/index', () => ({
  default: { replace: vi.fn() },
}));

const PageHeader = {
  name: 'SettingsSubPageHeader',
  props: ['headerTitle', 'headerContent'],
  template: '<header>{{ headerTitle }}</header>',
};
const AgentSelector = {
  name: 'AgentSelector',
  props: [
    'agentList',
    'selectedAgents',
    'updateSelectedAgents',
    'isWorking',
    'submitButtonText',
  ],
  template: '<button type="submit">{{ submitButtonText }}</button>',
};

const agents = [{ id: 1 }, { id: 2 }];

const mountStep = (dispatch = vi.fn().mockResolvedValue()) => {
  const getTeam = vi.fn(() => ({ name: 'Support' }));
  const store = createStore({
    getters: {
      'agents/getAgents': () => agents,
      'teams/getTeam': () => getTeam,
    },
  });
  store.dispatch = dispatch;
  const wrapper = mount(AddAgents, {
    global: {
      plugins: [store],
      mocks: {
        $route: { params: { teamId: 6 } },
        $t: (key, args) => (args ? `${key}:${args.teamName}` : key),
      },
      stubs: { PageHeader, AgentSelector },
    },
  });
  return { wrapper, dispatch, getTeam };
};

describe('Team AddAgents behaviour', () => {
  it('loads agents and names the team', () => {
    const { wrapper, dispatch, getTeam } = mountStep();
    expect(dispatch).toHaveBeenCalledWith('agents/get');
    expect(getTeam).toHaveBeenCalledWith(6);
    expect(wrapper.find('header').text()).toBe(
      'TEAMS_SETTINGS.ADD.TITLE:Support'
    );
    const selector = wrapper.findComponent(AgentSelector);
    expect(selector.props('agentList')).toEqual(agents);
    expect(selector.props('submitButtonText')).toBe(
      'TEAMS_SETTINGS.ADD.BUTTON_TEXT'
    );
  });

  it('picks agents and validates an empty selection', async () => {
    const { wrapper } = mountStep();
    const selector = wrapper.findComponent(AgentSelector);
    selector.props('updateSelectedAgents')([]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.error-message').text()).toBe(
      'TEAMS_SETTINGS.ADD.AGENT_VALIDATION_ERROR'
    );

    selector.props('updateSelectedAgents')([2]);
    await wrapper.vm.$nextTick();
    expect(selector.props('selectedAgents')).toEqual([2]);
    expect(wrapper.find('.error-message').exists()).toBe(false);

    wrapper.vm.selectAllAgents();
    await wrapper.vm.$nextTick();
    expect(selector.props('selectedAgents')).toEqual([1, 2]);
  });

  it('saves members and goes to the finish step', async () => {
    let resolve;
    const dispatch = vi.fn(action =>
      action === 'teamMembers/create'
        ? new Promise(done => {
            resolve = done;
          })
        : Promise.resolve()
    );
    const { wrapper } = mountStep(dispatch);
    wrapper.findComponent(AgentSelector).props('updateSelectedAgents')([1]);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.findComponent(AgentSelector).props('isWorking')).toBe(true);
    expect(dispatch).toHaveBeenCalledWith('teamMembers/create', {
      teamId: 6,
      agentsList: [1],
    });
    resolve();
    await flushPromises();
    expect(router.replace).toHaveBeenCalledWith({
      name: 'settings_teams_finish',
      params: { page: 'new', teamId: 6 },
    });
    expect(dispatch).toHaveBeenCalledWith('teams/get');
    expect(wrapper.findComponent(AgentSelector).props('isWorking')).toBe(false);
  });

  it('alerts when saving fails', async () => {
    const dispatch = vi.fn(action =>
      action === 'teamMembers/create'
        ? Promise.reject(new Error('nope'))
        : Promise.resolve()
    );
    const { wrapper } = mountStep(dispatch);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('nope');
    expect(router.replace).not.toHaveBeenCalled();
  });
});
