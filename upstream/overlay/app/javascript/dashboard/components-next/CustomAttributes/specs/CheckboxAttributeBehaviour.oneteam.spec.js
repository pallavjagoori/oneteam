/**
 * OneTeam behaviour spec for the checkbox custom attribute.
 *
 * Covers starting the switch from the attribute value, emitting updates
 * on change, and the delete button that only shows while editing.
 */
import { mount } from '@vue/test-utils';
import CheckboxAttribute from '../CheckboxAttribute.vue';

const Switch = {
  name: 'Switch',
  props: { modelValue: Boolean },
  emits: ['update:modelValue', 'change'],
  template: '<input type="checkbox" />',
};
const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

/**
 * Mounts the attribute.
 *
 * @param {object} props Attribute props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountAttribute = props =>
  mount(CheckboxAttribute, {
    props: { attribute: { value: 1 }, ...props },
    global: { stubs: { Switch, Button } },
  });

describe('CheckboxAttribute behaviour', () => {
  it('syncs the switch and emits updates', async () => {
    const wrapper = mountAttribute();
    const toggle = wrapper.getComponent(Switch);
    expect(toggle.props('modelValue')).toBe(true);
    expect(wrapper.classes()).toContain('justify-end');
    expect(wrapper.find('button').exists()).toBe(false);
    toggle.vm.$emit('update:modelValue', false);
    toggle.vm.$emit('change', false);
    await wrapper.vm.$nextTick();
    expect(toggle.props('modelValue')).toBe(false);
    expect(wrapper.emitted('update')).toEqual([[false]]);
  });

  it('deletes while editing', async () => {
    const wrapper = mountAttribute({
      attribute: { value: null },
      isEditingView: true,
    });
    expect(wrapper.getComponent(Switch).props('modelValue')).toBe(false);
    expect(wrapper.classes()).toContain('justify-start');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });
});
