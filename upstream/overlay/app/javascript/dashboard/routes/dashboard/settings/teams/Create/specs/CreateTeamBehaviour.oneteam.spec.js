/**
 * OneTeam behaviour spec for the create-team step.
 *
 * Covers creating the team and moving on to adding agents, and the
 * error alert when creation fails.
 */
import { mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import router from '../../../../../index';
import CreateTeam from '../CreateTeam.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../../../../../index', () => ({ default: { replace: vi.fn() } }));

const TeamForm = {
  name: 'TeamForm',
  props: ['onSubmit', 'submitButtonText'],
  template: '<form />',
};

/**
 * Mounts the step with a store dispatch spy.
 *
 * @param {Function} dispatch Store dispatch.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCreate = dispatch =>
  mount(CreateTeam, {
    global: {
      stubs: { TeamForm, PageHeader: true },
      mocks: { $t: key => key, $store: { dispatch } },
    },
  });

describe('CreateTeam behaviour', () => {
  it('creates the team and opens the add-agents step', async () => {
    const dispatch = vi.fn().mockResolvedValue({ id: 9 });
    const form = mountCreate(dispatch).getComponent(TeamForm);
    expect(form.props('submitButtonText')).toBe(
      'TEAMS_SETTINGS.FORM.SUBMIT_CREATE'
    );
    await form.props('onSubmit')({ name: 'Ops' });
    expect(dispatch).toHaveBeenCalledWith('teams/create', { name: 'Ops' });
    expect(router.replace).toHaveBeenCalledWith({
      name: 'settings_teams_add_agents',
      params: { page: 'new', teamId: 9 },
    });
  });

  it('alerts when creating fails', async () => {
    const dispatch = vi.fn().mockRejectedValue(new Error('nope'));
    await mountCreate(dispatch).getComponent(TeamForm).props('onSubmit')({});
    expect(useAlert).toHaveBeenCalledWith(
      'TEAMS_SETTINGS.TEAM_FORM.ERROR_MESSAGE'
    );
  });
});
