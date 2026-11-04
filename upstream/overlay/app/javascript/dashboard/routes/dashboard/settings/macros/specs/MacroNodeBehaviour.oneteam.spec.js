/**
 * OneTeam behaviour spec for the macro editor MacroNode.
 *
 * Covers the drag and delete buttons, the error message, whether the
 * action needs an input, and forwarding reset events and model updates.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import MacroNode from '../MacroNode.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/useMacros', () => ({
  useMacros: () => ({ getMacroDropdownValues: name => [name] }),
}));

const ActionStub = {
  name: 'ActionInput',
  props: ['modelValue', 'showActionInput', 'errorMessage', 'dropdownValues'],
  emits: ['update:modelValue', 'resetAction'],
  template: '<div />',
};

/**
 * Mounts the node.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountNode = props =>
  mount(MacroNode, {
    props: { modelValue: { action_name: 'add_label' }, ...props },
    global: {
      mocks: { $t: key => key },
      directives: { tooltip: {} },
      provide: {
        macroActionTypes: ref([
          { key: 'add_label', inputType: 'multi_select' },
          { key: 'resolve_conversation', inputType: null },
        ]),
      },
      stubs: {
        ActionInput: ActionStub,
        NextButton: {
          props: ['icon'],
          emits: ['click'],
          template: '<button :class="icon" @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('MacroNode behaviour', () => {
  it('shows drag and delete buttons and forwards events', async () => {
    const wrapper = mountNode({});
    const action = wrapper.findComponent(ActionStub);
    expect(action.props('showActionInput')).toBe(true);
    expect(action.props('errorMessage')).toBe('');
    expect(action.props('dropdownValues')).toEqual(['add_label']);
    expect(wrapper.find('.i-lucide-menu').exists()).toBe(true);
    await wrapper.find('.i-lucide-trash-2').trigger('click');
    action.vm.$emit('resetAction');
    action.vm.$emit('update:modelValue', {
      action_name: 'resolve_conversation',
    });
    expect(wrapper.emitted('deleteNode')).toHaveLength(1);
    expect(wrapper.emitted('resetAction')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')).toEqual([
      [{ action_name: 'resolve_conversation' }],
    ]);
  });

  it('hides the buttons for a single node and shows the error', () => {
    const wrapper = mountNode({
      singleNode: true,
      errorKey: 'ATTRIBUTE_VALUE_REQUIRED',
      modelValue: { action_name: 'resolve_conversation' },
    });
    expect(wrapper.find('button').exists()).toBe(false);
    const action = wrapper.findComponent(ActionStub);
    expect(action.props('showActionInput')).toBe(false);
    expect(action.props('errorMessage')).toBe(
      'MACROS.ERRORS.ATTRIBUTE_VALUE_REQUIRED'
    );
    expect(wrapper.find('.animate-shake').exists()).toBe(true);
  });

  it('never shows an input for send message', () => {
    const wrapper = mountNode({ modelValue: { action_name: 'send_message' } });
    expect(wrapper.findComponent(ActionStub).props('showActionInput')).toBe(
      false
    );
  });
});
