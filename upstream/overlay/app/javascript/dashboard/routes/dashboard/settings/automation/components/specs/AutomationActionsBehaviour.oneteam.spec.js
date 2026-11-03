/**
 * OneTeam behaviour spec for the automation actions list.
 *
 * Covers one input per action with its dropdown values, input
 * visibility, error message and file name, the error outline, updating
 * an action, resetting, removing and appending actions.
 */
import { mount } from '@vue/test-utils';
import AutomationActions from '../AutomationActions.vue';

vi.mock('dashboard/helper/automationHelper', () => ({
  getFileName: action => `file-${action.action_name}`,
  showActionInput: (types, name) => name !== 'resolve',
}));

const AutomationActionInput = {
  name: 'AutomationActionInput',
  props: [
    'modelValue',
    'dropdownValues',
    'showActionInput',
    'errorMessage',
    'initialFileName',
  ],
  emits: ['update:modelValue', 'resetAction', 'removeAction'],
  template: '<li />',
};
const NextButton = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

/**
 * Mounts the list.
 *
 * @param {object} props List props.
 * @returns {{ wrapper: import('@vue/test-utils').VueWrapper, spies: object }}
 *   The wrapper and the callback spies.
 */
const mountList = props => {
  const spies = {
    appendNewAction: vi.fn(),
    removeAction: vi.fn(),
    resetAction: vi.fn(),
    getActionDropdownValues: name => [`${name}-options`],
  };
  const wrapper = mount(AutomationActions, {
    props: {
      actionTypes: [],
      modelValue: [{ action_name: 'send_message' }, { action_name: 'resolve' }],
      'onUpdate:modelValue': () => {},
      ...spies,
      ...props,
    },
    global: {
      stubs: { AutomationActionInput, NextButton },
      mocks: { $t: key => key },
    },
  });
  return { wrapper, spies };
};

describe('AutomationActions behaviour', () => {
  it('renders each action with its errors and files', () => {
    const { wrapper } = mountList({
      showFileName: true,
      errors: { action_1: 'ACTION_PARAMETERS_REQUIRED' },
    });
    expect(wrapper.get('ul').classes()).toContain('outline-n-ruby-5');
    const [first, second] = wrapper.findAllComponents(AutomationActionInput);
    expect(first.props()).toMatchObject({
      dropdownValues: ['send_message-options'],
      showActionInput: true,
      errorMessage: '',
      initialFileName: 'file-send_message',
    });
    expect(second.props()).toMatchObject({
      showActionInput: false,
      errorMessage: 'AUTOMATION.ERRORS.ACTION_PARAMETERS_REQUIRED',
    });
  });

  it('updates, resets, removes and appends actions', async () => {
    const { wrapper, spies } = mountList({ errors: { condition_0: 'X' } });
    expect(wrapper.get('ul').classes()).toContain('outline-n-weak');
    const [first, second] = wrapper.findAllComponents(AutomationActionInput);
    expect(first.props('initialFileName')).toBe('');
    first.vm.$emit('update:modelValue', { action_name: 'add_label' });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.$.setupState.actions[0]).toEqual({
      action_name: 'add_label',
    });
    second.vm.$emit('resetAction');
    second.vm.$emit('removeAction');
    await wrapper.get('button').trigger('click');
    expect(spies.resetAction).toHaveBeenCalledWith(1);
    expect(spies.removeAction).toHaveBeenCalledWith(1);
    expect(spies.appendNewAction).toHaveBeenCalled();
  });

  it('defaults to no files or errors', () => {
    expect(AutomationActions.props.files.default()).toEqual([]);
    expect(AutomationActions.props.errors.default()).toEqual({});
  });
});
