/**
 * OneTeam behaviour spec for the team create and edit wizard shells.
 *
 * Covers the wizard steps each shell passes to the wizard, with their
 * titles, bodies and routes.
 */
import { mount } from '@vue/test-utils';
import CreateIndex from '../Create/Index.vue';
import EditIndex from '../Edit/Index.vue';

/**
 * Mounts a wizard shell and returns the steps it passes on.
 *
 * @param {object} component shell component
 * @returns {object[]}
 */
const stepsOf = component =>
  mount(component, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        WootWizard: {
          name: 'WootWizard',
          props: ['items'],
          template: '<div />',
        },
        RouterView: true,
      },
    },
  })
    .findComponent({ name: 'WootWizard' })
    .props('items');

describe('team wizard shells', () => {
  it('lists the create steps', () => {
    expect(stepsOf(CreateIndex)).toEqual([
      {
        title: 'TEAMS_SETTINGS.CREATE_FLOW.WIZARD_CREATE.TITLE',
        body: 'TEAMS_SETTINGS.CREATE_FLOW.WIZARD_CREATE.BODY',
        route: 'settings_teams_new',
      },
      {
        title: 'TEAMS_SETTINGS.CREATE_FLOW.WIZARD_ADD_AGENTS.TITLE',
        body: 'TEAMS_SETTINGS.CREATE_FLOW.WIZARD_ADD_AGENTS.BODY',
        route: 'settings_teams_add_agents',
      },
      {
        title: 'TEAMS_SETTINGS.CREATE_FLOW.WIZARD_FINISH.TITLE',
        body: 'TEAMS_SETTINGS.CREATE_FLOW.WIZARD_FINISH.BODY',
        route: 'settings_teams_finish',
      },
    ]);
  });

  it('lists the edit steps', () => {
    expect(stepsOf(EditIndex).map(step => step.route)).toEqual([
      'settings_teams_edit',
      'settings_teams_edit_members',
      'settings_teams_edit_finish',
    ]);
    expect(stepsOf(EditIndex)[1].title).toBe(
      'TEAMS_SETTINGS.EDIT_FLOW.EDIT_WIZARD_AGENTS.TITLE'
    );
  });
});
