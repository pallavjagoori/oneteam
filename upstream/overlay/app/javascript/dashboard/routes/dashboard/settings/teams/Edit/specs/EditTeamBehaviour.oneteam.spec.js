/**
 * OneTeam behaviour spec for the edit-team details step.
 *
 * Covers the spinner while the team is unknown or loading, the form with
 * the team's data, saving and moving on to the members step, and the
 * error alert when saving fails.
 */
import { mount, flushPromises } from '@vue/test-utils';
import EditTeam from '../EditTeam.vue';
import { useAlert } from 'dashboard/composables';
import router from '../../../../../index';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('../../../../../index', () => ({ default: { replace: vi.fn() } }));

const TeamForm = {
  name: 'TeamForm',
  props: ['onSubmit', 'formData'],
  template: '<form />',
};

const mountEdit = ({ team = { id: 4, name: 'Ops' }, flags = {}, dispatch }) =>
  mount(EditTeam, {
    global: {
      mocks: {
        $route: { params: { teamId: '4' } },
        $store: {
          getters: {
            'teams/getTeam': () => team,
            'teams/getUIFlags': flags,
          },
          dispatch: dispatch || vi.fn(),
        },
      },
      stubs: { TeamForm, PageHeader: true, Spinner: { template: '<b />' } },
    },
  });

describe('EditTeam behaviour', () => {
  it('shows a spinner until the team is loaded', () => {
    expect(mountEdit({ team: {} }).find('b').exists()).toBe(true);
    expect(
      mountEdit({ flags: { isFetching: true } })
        .find('b')
        .exists()
    ).toBe(true);
  });

  it('saves the team and opens the members step', async () => {
    const dispatch = vi.fn().mockResolvedValue();
    const form = mountEdit({ dispatch }).findComponent(TeamForm);
    expect(form.props('formData')).toEqual({ id: 4, name: 'Ops' });
    await form.props('onSubmit')({ name: 'New' });
    expect(dispatch).toHaveBeenCalledWith('teams/update', {
      id: '4',
      name: 'New',
    });
    expect(router.replace).toHaveBeenCalledWith({
      name: 'settings_teams_edit_members',
      params: { page: 'edit', teamId: '4' },
    });
  });

  it('alerts when saving fails', async () => {
    const dispatch = vi.fn().mockRejectedValue(new Error('no'));
    await mountEdit({ dispatch }).findComponent(TeamForm).props('onSubmit')({});
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'TEAMS_SETTINGS.TEAM_FORM.ERROR_MESSAGE'
    );
    expect(router.replace).not.toHaveBeenCalled();
  });
});
