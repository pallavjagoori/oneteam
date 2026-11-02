/**
 * OneTeam behaviour spec for a date custom attribute.
 *
 * Covers showing the saved date or the placeholder, opening the editor
 * from the value (sidebar) or the pencil (editing view), defaulting to
 * today, saving a picked date on Enter or with the check button,
 * rejecting an empty value, closing on an outside click, and delete.
 */
import { mount, flushPromises } from '@vue/test-utils';
import DateAttribute from '../DateAttribute.vue';

let clickaway;

const Input = {
  name: 'Input',
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue', 'enter'],
  template: '<input class="date" :value="modelValue" />',
};
const Button = {
  name: 'Button',
  props: ['icon', 'color'],
  emits: ['click'],
  template: '<button :data-icon="icon" @click="$emit(\'click\')" />',
};

const mountAttribute = (attribute, props = {}) =>
  mount(DateAttribute, {
    props: { attribute, ...props },
    global: {
      stubs: { Input, Button },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            clickaway = binding.value;
          },
        },
      },
    },
  });

const today = () => new Date().toISOString().slice(0, 10);

describe('DateAttribute behaviour', () => {
  it('shows the placeholder and edits from the value', async () => {
    const wrapper = mountAttribute({ value: null });
    const value = wrapper.find('span');
    expect(value.text()).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.TRIGGER.INPUT'
    );
    expect(value.classes()).toContain('cursor-pointer');
    expect(wrapper.classes()).toContain('justify-end');

    await value.trigger('click');
    const input = wrapper.findComponent(Input);
    expect(input.props('modelValue')).toBe(today());
    expect(input.props('messageType')).toBe('info');

    await input.vm.$emit('update:modelValue', '2026-02-03');
    await input.vm.$emit('enter');
    await flushPromises();
    const [date] = wrapper.emitted('update')[0];
    expect(date.toISOString()).toBe(new Date('2026-02-03').toISOString());
    expect(wrapper.findComponent(Input).exists()).toBe(false);
  });

  it('rejects an empty date and falls back to blank', async () => {
    const wrapper = mountAttribute({ value: null });
    await wrapper.find('span').trigger('click');
    const input = wrapper.findComponent(Input);
    await input.vm.$emit('update:modelValue', '');
    expect(input.props('modelValue')).toBe(today());
    await wrapper.find('[data-icon="i-lucide-check"]').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(input.props('message')).toBe(
      'CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.VALIDATIONS.INVALID_DATE'
    );
    expect(input.props('messageType')).toBe('error');
    expect(input.props('modelValue')).toBe('');
    expect(wrapper.find('[data-icon="i-lucide-check"]').exists()).toBe(true);

    clickaway();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(Input).exists()).toBe(false);
  });

  it('uses the pencil and delete buttons in the editing view', async () => {
    const wrapper = mountAttribute(
      { value: '2025-07-04T00:00:00.000Z' },
      { isEditingView: true }
    );
    const value = wrapper.find('span');
    expect(value.text()).toBe(
      new Date('2025-07-04T00:00:00.000Z').toLocaleDateString()
    );
    expect(value.classes()).toContain('truncate');
    expect(wrapper.classes()).toContain('justify-start');

    await value.trigger('click');
    expect(wrapper.findComponent(Input).exists()).toBe(false);

    await wrapper.find('[data-icon="i-lucide-trash"]').trigger('click');
    expect(wrapper.emitted('delete')).toHaveLength(1);

    await wrapper.find('[data-icon="i-lucide-pencil"]').trigger('click');
    expect(wrapper.findComponent(Input).props('modelValue')).toBe('2025-07-04');
  });

  it('reads the saved date when the edited value is cleared', async () => {
    const wrapper = mountAttribute({ value: '2025-07-04T00:00:00.000Z' });
    await wrapper.find('span').trigger('click');
    const input = wrapper.findComponent(Input);
    await input.vm.$emit('update:modelValue', null);
    expect(input.props('modelValue')).toBe('2025-07-04');
  });
});
