/**
 * OneTeam behaviour spec for profile preference parts: the font size select
 * and the notification checkbox.
 */
import { mount } from '@vue/test-utils';
import FontSize from '../FontSize.vue';
import NotificationCheckBox from '../NotificationCheckBox.vue';

vi.mock('dashboard/composables/useFontSize', () => ({
  useFontSize: () => ({
    fontSizeOptions: [
      { value: 'default', label: 'Default' },
      { value: 'large', label: 'Large' },
    ],
  }),
}));

const FormSelect = {
  name: 'FormSelect',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: '<select><slot /></select>',
};

describe('FontSize', () => {
  it('lists the sizes and emits the picked one', () => {
    const wrapper = mount(FontSize, {
      props: { value: 'large', label: 'Font size', description: 'Pick one' },
      global: { stubs: { FormSelect } },
    });
    expect(wrapper.text()).toContain('Font size');
    expect(wrapper.findAll('option')).toHaveLength(2);
    expect(wrapper.findAll('option')[1].element.selected).toBe(true);
    wrapper.getComponent(FormSelect).vm.$emit('update:modelValue', 'default');
    expect(wrapper.emitted('change')).toEqual([['default']]);
  });
});

describe('NotificationCheckBox', () => {
  it('forwards input with its type and follows new flags', async () => {
    const wrapper = mount(NotificationCheckBox, {
      props: {
        modelValue: 'email_assigned',
        selectedFlags: [],
        type: 'email',
        span: 3,
      },
    });
    expect(wrapper.classes()).toContain('col-span-3');
    const input = wrapper.find('input');
    expect(input.element.checked).toBe(false);
    await input.trigger('input');
    expect(wrapper.emitted('update:modelValue')[0][0]).toBe('email');
    expect(wrapper.emitted('input')[0][0]).toBe('email');
    await wrapper.setProps({ selectedFlags: ['email_assigned'] });
    expect(input.element.checked).toBe(true);
    await input.setValue(false);
    expect(input.element.checked).toBe(false);
  });
});
