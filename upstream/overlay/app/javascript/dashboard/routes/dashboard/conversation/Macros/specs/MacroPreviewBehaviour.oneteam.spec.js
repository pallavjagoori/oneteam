/**
 * OneTeam behaviour spec for the macro preview popover.
 *
 * Covers the macro name, one step per resolved action with its label and
 * value, and the connector line on every step but the last.
 */
import { mount } from '@vue/test-utils';
import MacroPreview from '../MacroPreview.vue';

vi.mock('dashboard/composables/useMacros', () => ({
  useMacros: () => ({
    resolveMacroActions: macro =>
      macro.actions.map(action => ({
        actionName: action.action_name.toUpperCase(),
        actionValue: action.value,
      })),
  }),
}));

describe('MacroPreview behaviour', () => {
  it('lists the macro steps', () => {
    const wrapper = mount(MacroPreview, {
      props: {
        macro: {
          name: 'Close & tag',
          actions: [
            { action_name: 'add_label', value: 'vip' },
            { action_name: 'resolve_conversation', value: '' },
          ],
        },
      },
      global: { mocks: { $t: key => key } },
    });
    expect(wrapper.get('h6').text()).toBe('Close & tag');
    const steps = wrapper.findAll('.macro-block');
    expect(steps).toHaveLength(2);
    expect(steps[0].text()).toContain('MACROS.ACTIONS.ADD_LABEL');
    expect(steps[0].text()).toContain('vip');
    expect(steps[0].find('.w-px').exists()).toBe(true);
    expect(steps[1].find('.w-px').exists()).toBe(false);
  });
});
