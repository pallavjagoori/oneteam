/**
 * OneTeam behaviour spec for ReorderableMultiSelect dragging and closing.
 *
 * Dragging a row over another reorders the model and highlights the
 * dragged row until the drag ends; a click outside closes the dropdown.
 */
import { mount } from '@vue/test-utils';
import ReorderableMultiSelect from '../ReorderableMultiSelect.vue';

const OnClickOutside = {
  name: 'OnClickOutside',
  emits: ['trigger'],
  template: '<div><slot /></div>',
};

const options = [
  { value: 1, label: 'One' },
  { value: 2, label: 'Two' },
];

const mountSelect = () =>
  mount(ReorderableMultiSelect, {
    props: {
      options,
      modelValue: [1, 2],
      'onUpdate:modelValue': value => {
        // Keep the parent model in sync, as v-model would.
        // eslint-disable-next-line no-use-before-define
        wrapper.setProps({ modelValue: value });
      },
    },
    global: {
      stubs: {
        OnClickOutside,
        ComboBoxDropdown: {
          methods: { focus() {} },
          template: '<div class="dropdown" />',
        },
        EmojiIcon: true,
        Button: true,
      },
    },
  });

let wrapper;

describe('ReorderableMultiSelect drag behaviour', () => {
  it('reorders rows by dragging and clears the highlight on drag end', async () => {
    wrapper = mountSelect();
    const rows = () => wrapper.findAll('[draggable="true"]');
    await rows()[0].trigger('dragstart');
    await rows()[1].trigger('dragover');
    expect(wrapper.props('modelValue')).toEqual([2, 1]);
    expect(rows()[1].classes()).toContain('opacity-40');
    await rows()[1].trigger('dragend');
    expect(rows().some(row => row.classes().includes('opacity-40'))).toBe(
      false
    );
  });

  it('closes the dropdown on an outside click', async () => {
    wrapper = mountSelect();
    wrapper.vm.$.setupState.toggleDropdown();
    expect(wrapper.vm.$.setupState.isOpen).toBe(true);
    await wrapper.findComponent(OnClickOutside).vm.$emit('trigger');
    expect(wrapper.vm.$.setupState.isOpen).toBe(false);
  });
});
