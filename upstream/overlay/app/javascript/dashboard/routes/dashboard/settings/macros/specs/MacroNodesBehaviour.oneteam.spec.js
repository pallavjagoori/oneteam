/**
 * OneTeam behaviour spec for the macro node list.
 *
 * Covers rendering a node per action with its attachment file name,
 * relaying node events, adding a node, and the v-model setter.
 */
import { mount } from '@vue/test-utils';
import MacroNodes from '../MacroNodes.vue';

const MacroNodeStub = {
  name: 'MacroNode',
  props: ['fileName', 'singleNode', 'errorKey', 'index'],
  emits: ['resetAction', 'deleteNode', 'update:modelValue'],
  template: '<div class="node" />',
};

/**
 * Mounts the list with the given actions.
 *
 * @param {Array<object>} modelValue macro actions
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountNodes = modelValue =>
  mount(MacroNodes, {
    props: modelValue && {
      modelValue,
      errors: { action_1: 'required' },
      files: [{ blob_id: 'b1', filename: 'deck.pdf' }],
    },
    global: {
      mocks: { $t: key => key },
      stubs: {
        Draggable: {
          props: ['list'],
          template:
            '<div><template v-for="(el, i) in list" :key="i"><slot name="item" :element="el" :index="i" /></template></div>',
        },
        MacroNode: MacroNodeStub,
        NextButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

describe('Macro nodes behaviour', () => {
  const actions = [
    { action_name: 'send_attachment', action_params: ['b1'] },
    { action_name: 'resolve_conversation', action_params: [] },
  ];

  it('renders a node per action and relays its events', async () => {
    const wrapper = mountNodes(actions);
    const nodes = wrapper.findAllComponents({ name: 'MacroNode' });
    expect(nodes.map(node => node.props('fileName'))).toEqual(['deck.pdf', '']);
    expect(nodes[1].props('errorKey')).toBe('required');
    expect(nodes[0].props('singleNode')).toBe(false);
    nodes[1].vm.$emit('resetAction');
    nodes[0].vm.$emit('deleteNode');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('resetAction')).toEqual([[1]]);
    expect(wrapper.emitted('deleteNode')).toEqual([[0]]);
    expect(wrapper.emitted('addNewNode')).toHaveLength(1);
  });

  it('renders no nodes by default', () => {
    const wrapper = mountNodes(null);
    expect(wrapper.findAllComponents({ name: 'MacroNode' })).toHaveLength(0);
    expect(wrapper.find('button').text()).toBe('MACROS.EDITOR.ADD_BTN_TOOLTIP');
  });

  it('emits model updates through the action data setter', () => {
    const wrapper = mountNodes([actions[1]]);
    expect(
      wrapper.findComponent({ name: 'MacroNode' }).props('singleNode')
    ).toBe(true);
    wrapper.vm.actionData = actions;
    expect(wrapper.emitted('update:modelValue')).toEqual([[actions]]);
  });

  it('writes a node edit back into its action slot', () => {
    const model = [{ ...actions[1] }];
    const wrapper = mountNodes(model);
    const edited = { action_name: 'mute_conversation', action_params: [] };
    wrapper
      .findComponent({ name: 'MacroNode' })
      .vm.$emit('update:modelValue', edited);
    expect(model[0]).toEqual(edited);
  });
});
