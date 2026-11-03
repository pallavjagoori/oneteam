/**
 * Covers the team creation finish screen, which links back to the team list.
 */
import { mount } from '@vue/test-utils';
import FinishSetup from '../FinishSetup.vue';

describe('Teams FinishSetup', () => {
  it('links to the team list', () => {
    const wrapper = mount(FinishSetup, {
      global: {
        stubs: {
          EmptyState: { template: '<div><slot /></div>' },
          NextButton: {
            props: ['label'],
            template: '<button>{{ label }}</button>',
          },
          RouterLink: {
            props: ['to'],
            template: '<a :data-to="to.name"><slot /></a>',
          },
        },
        mocks: { $t: key => key },
      },
    });
    expect(wrapper.find('a').attributes('data-to')).toBe('settings_teams_list');
    expect(wrapper.find('button').text()).toBe(
      'TEAMS_SETTINGS.FINISH.BUTTON_TEXT'
    );
  });
});
