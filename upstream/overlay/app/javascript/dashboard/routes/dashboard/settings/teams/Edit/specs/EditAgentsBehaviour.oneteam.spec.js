/**
 * OneTeam behaviour spec for editing a team's agents.
 *
 * Covers loading agents and current members (and an empty selection
 * when that fails), the spinner until the team and members are ready,
 * the validation message for an empty selection, saving members (moving
 * to the finish step and refreshing teams), and save errors.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import router from 'dashboard/routes/index';
import EditAgents from '../EditAgents.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/routes/index', () => ({ default: { replace: vi.fn() } }));

const Header = {
  name: 'PageHeader',
  props: ['headerTitle'],
  template: '<header>{{ headerTitle }}</header>',
};
const Selector = {
  name: 'AgentSelector',
  props: ['agentList', 'selectedAgents', 'updateSelectedAgents', 'isWorking'],
  template: '<div class="selector" />',
};

const mountPage = async ({
  team = { id: 3, name: 'Sales' },
  isFetching = false,
  membersFail = false,
} = {}) => {
  const dispatch = vi.fn(action => {
    if (action === 'teamMembers/get' && membersFail)
      return Promise.reject(new Error('x'));
    return Promise.resolve();
  });
  const wrapper = mount(EditAgents, {
    global: {
      stubs: {
        PageHeader: Header,
        AgentSelector: Selector,
        Spinner: { template: '<i class="spin" />' },
      },
      mocks: {
        $t: (key, params) => (params ? `${key}:${params.teamName}` : key),
        $route: { params: { teamId: '3' } },
        $store: {
          dispatch,
          getters: {
            'agents/getAgents': [{ id: 1 }, { id: 2 }],
            'teamMembers/getUIFlags': { isFetching },
            'teams/getTeam': () => team,
            'teamMembers/getTeamMembers': () => [{ id: 2 }],
          },
        },
      },
    },
  });
  await flushPromises();
  return { wrapper, dispatch };
};
const selector = wrapper => wrapper.findComponent(Selector);

describe('EditAgents behaviour', () => {
  it('loads agents and preselects current members', async () => {
    const { wrapper, dispatch } = await mountPage();
    expect(dispatch).toHaveBeenCalledWith('agents/get');
    expect(dispatch).toHaveBeenCalledWith('teamMembers/get', { teamId: '3' });
    expect(wrapper.find('header').text()).toBe(
      'TEAMS_SETTINGS.EDIT_FLOW.AGENTS.TITLE:Sales'
    );
    expect(selector(wrapper).props()).toMatchObject({
      agentList: [{ id: 1 }, { id: 2 }],
      selectedAgents: [2],
      isWorking: false,
    });
    expect(wrapper.find('.error-message').exists()).toBe(false);
  });

  it('shows a spinner until the team and members are ready', async () => {
    const fetching = await mountPage({ isFetching: true });
    expect(fetching.wrapper.find('.spin').exists()).toBe(true);
    const noTeam = await mountPage({ team: {} });
    expect(noTeam.wrapper.find('.spin').exists()).toBe(true);
  });

  it('starts empty and flags the selection when members fail to load', async () => {
    const { wrapper } = await mountPage({ membersFail: true });
    expect(selector(wrapper).props('selectedAgents')).toEqual([]);
    expect(wrapper.find('.error-message').text()).toBe(
      'TEAMS_SETTINGS.ADD.AGENT_VALIDATION_ERROR'
    );
  });

  it('saves the members and moves to the finish step', async () => {
    const { wrapper, dispatch } = await mountPage();
    selector(wrapper).props('updateSelectedAgents')([1, 2]);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('teamMembers/update', {
      teamId: '3',
      agentsList: [1, 2],
    });
    expect(router.replace).toHaveBeenCalledWith({
      name: 'settings_teams_edit_finish',
      params: { page: 'edit', teamId: '3' },
    });
    expect(dispatch).toHaveBeenCalledWith('teams/get');
  });

  it('alerts when saving fails', async () => {
    const { wrapper, dispatch } = await mountPage();
    dispatch.mockImplementation(action =>
      action === 'teamMembers/update'
        ? Promise.reject(new Error('Too many agents'))
        : Promise.resolve()
    );
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Too many agents');
    expect(router.replace).not.toHaveBeenCalled();
    expect(selector(wrapper).props('isWorking')).toBe(false);
  });
});
