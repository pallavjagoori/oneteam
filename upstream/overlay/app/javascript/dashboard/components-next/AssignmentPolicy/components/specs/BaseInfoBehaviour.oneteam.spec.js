/**
 * OneTeam behaviour spec for the assignment policy base info form.
 *
 * Covers the name and description fields with their labels and
 * placeholders, reporting validity as they are filled in, the optional
 * status switch, and the model defaults.
 */
import { mount } from '@vue/test-utils';
import BaseInfo from '../BaseInfo.vue';

const Input = {
  name: 'Input',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<input />',
};
const Switch = {
  name: 'Switch',
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  template: '<button class="switch" />',
};
const WithLabel = {
  name: 'WithLabel',
  props: ['label', 'name'],
  template: '<label><slot /></label>',
};

/**
 * Mounts the form with stubbed fields.
 *
 * @param {object} props Form props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountForm = (props = {}) =>
  mount(BaseInfo, {
    props,
    global: { stubs: { Input, Switch, WithLabel } },
  });

describe('BaseInfo behaviour', () => {
  it('reports validity once the name and description are filled', async () => {
    const wrapper = mountForm({
      nameLabel: 'Name',
      namePlaceholder: 'Policy name',
      descriptionLabel: 'Description',
    });
    expect(wrapper.emitted('validationChange')[0]).toEqual([
      { isValid: false, section: 'baseInfo' },
    ]);
    const [name, description] = wrapper.findAllComponents(Input);
    expect(name.props('placeholder')).toBe('Policy name');
    name.vm.$emit('update:modelValue', 'Round robin');
    description.vm.$emit('update:modelValue', 'Shares conversations');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:policyName')).toEqual([['Round robin']]);
    expect(wrapper.emitted('validationChange').at(-1)).toEqual([
      { isValid: true, section: 'baseInfo' },
    ]);
    expect(wrapper.findComponent(Switch).exists()).toBe(false);
  });

  it('shows the status switch with a label', async () => {
    const wrapper = mountForm({
      statusLabel: 'Status',
      statusPlaceholder: 'Enabled',
    });
    const toggle = wrapper.getComponent(Switch);
    expect(toggle.props('modelValue')).toBe(true);
    expect(wrapper.text()).toContain('Enabled');
    toggle.vm.$emit('update:modelValue', false);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:enabled')).toEqual([[false]]);
  });
});
