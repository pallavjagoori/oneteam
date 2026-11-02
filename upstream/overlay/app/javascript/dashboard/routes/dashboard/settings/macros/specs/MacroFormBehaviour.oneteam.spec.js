/**
 * OneTeam behaviour spec for the macro editor form.
 *
 * Covers passing actions, files and errors to the node list, editing the
 * name and visibility, adding, deleting and resetting action nodes (and
 * clearing only that node's error), submitting (blocked by invalid
 * actions or a missing name or visibility), swapping in new macro data
 * and the read-only view.
 */
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import MacroForm from '../MacroForm.vue';

const env = vi.hoisted(() => ({ errors: {} }));

vi.mock('dashboard/helper/validations', () => ({
  validateActions: () => env.errors,
}));

const MacroNodes = {
  name: 'MacroNodes',
  props: ['modelValue', 'files', 'errors'],
  emits: ['addNewNode', 'deleteNode', 'resetAction', 'update:modelValue'],
  template: '<div class="nodes" />',
};
const MacroProperties = {
  name: 'MacroProperties',
  props: ['macroName', 'macroVisibility', 'canManagePublicMacros', 'readOnly'],
  emits: ['update:name', 'update:visibility', 'submit'],
  template: '<div class="properties" />',
};

const macro = (overrides = {}) => ({
  name: 'Close',
  visibility: 'global',
  actions: [
    { action_name: 'add_label', action_params: ['vip'] },
    { action_name: 'resolve_conversation', action_params: [] },
  ],
  ...overrides,
});

const mountForm = (props = {}) => {
  const wrapper = mount(MacroForm, {
    props: { macroData: macro(), ...props },
    global: {
      stubs: { MacroNodes, MacroProperties },
      mocks: { $route: {} },
    },
  });
  return { wrapper };
};
const nodes = wrapper => wrapper.findComponent(MacroNodes);
const properties = wrapper => wrapper.findComponent(MacroProperties);

describe('Macro form behaviour', () => {
  beforeEach(() => {
    env.errors = {};
  });

  it('passes the macro down and edits name, visibility and nodes', async () => {
    const files = [{ id: 1 }];
    const { wrapper } = mountForm({ macroData: macro({ files }) });
    expect(nodes(wrapper).props('files')).toEqual(files);
    expect(properties(wrapper).props()).toMatchObject({
      macroName: 'Close',
      macroVisibility: 'global',
      canManagePublicMacros: true,
      readOnly: false,
    });
    expect(wrapper.find('.opacity-75').exists()).toBe(false);
    properties(wrapper).vm.$emit('update:name', 'Escalate');
    properties(wrapper).vm.$emit('update:visibility', 'personal');
    nodes(wrapper).vm.$emit('addNewNode');
    await nextTick();
    expect(properties(wrapper).props('macroName')).toBe('Escalate');
    expect(properties(wrapper).props('macroVisibility')).toBe('personal');
    expect(nodes(wrapper).props('modelValue').at(-1)).toEqual({
      action_name: 'assign_team',
      action_params: [],
    });
  });

  it('blocks submitting invalid actions and clears per-node errors', async () => {
    env.errors = { action_0: 'bad', action_1: 'bad' };
    const { wrapper } = mountForm({ macroData: macro({ files: null }) });
    expect(nodes(wrapper).props('files')).toEqual([]);
    properties(wrapper).vm.$emit('submit');
    await nextTick();
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(nodes(wrapper).props('errors')).toEqual(env.errors);

    nodes(wrapper).vm.$emit('resetAction', 0);
    await nextTick();
    expect(nodes(wrapper).props('errors')).toEqual({ action_1: 'bad' });
    expect(nodes(wrapper).props('modelValue')[0].action_params).toEqual([]);
    nodes(wrapper).vm.$emit('deleteNode', 1);
    await nextTick();
    expect(nodes(wrapper).props('errors')).toEqual({});
    expect(nodes(wrapper).props('modelValue')).toHaveLength(1);
  });

  it('requires a name and visibility before submitting', async () => {
    const { wrapper } = mountForm({ macroData: macro({ name: '' }) });
    properties(wrapper).vm.$emit('submit');
    await nextTick();
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.vm.v$.$dirty).toBe(true);

    const replacement = macro({ name: 'New' });
    await wrapper.setProps({ macroData: replacement });
    properties(wrapper).vm.$emit('submit');
    await nextTick();
    expect(wrapper.emitted('submit')).toEqual([[replacement]]);
  });

  it('renders read-only without public macro rights', () => {
    const { wrapper } = mountForm({ readOnly: true, canManagePublicMacros: false });
    expect(wrapper.find('.opacity-75').exists()).toBe(true);
    expect(properties(wrapper).props('readOnly')).toBe(true);
    expect(properties(wrapper).props('canManagePublicMacros')).toBe(false);
  });

  it('starts from an empty macro by default', () => {
    const wrapper = mount(MacroForm, {
      global: { stubs: { MacroNodes, MacroProperties }, mocks: { $route: {} } },
    });
    expect(nodes(wrapper).props('files')).toEqual([]);
  });
});
