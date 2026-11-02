/**
 * OneTeam behaviour spec for the team create/edit form.
 *
 * Covers defaults for a new team, prefilling an existing team, the name
 * validation message and disabled submit, picking an emoji or a coloured
 * icon (closing the picker), changing the icon colour, removing the icon,
 * toggling auto-assign and submitting the payload.
 */
import { flushPromises, mount } from '@vue/test-utils';
import TeamForm from '../TeamForm.vue';

const env = vi.hoisted(() => ({ hide: null }));

vi.mock('dashboard/components-next/emoji-icon-picker/EmojiIconPicker.vue', () => ({
  __esModule: true,
  default: {
    name: 'EmojiIconPicker',
    props: ['value', 'color'],
    emits: ['select', 'colorChange', 'remove'],
    template: '<div class="picker" />',
  },
}));

const FormInput = {
  name: 'FormInput',
  props: ['modelValue', 'name', 'hasError', 'errorMessage'],
  emits: ['update:modelValue', 'blur'],
  template:
    '<input :name="name" :value="modelValue" :data-error="errorMessage" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" />',
};
const Popover = {
  name: 'Popover',
  template: '<div class="popover"><slot /><slot name="content" :hide="hide" /></div>',
  setup: () => ({ hide: (...args) => env.hide(...args) }),
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading', 'type'],
  template: '<button :type="type" :disabled="disabled"><slot />{{ label }}</button>',
};
const EmojiIcon = {
  name: 'EmojiIcon',
  props: ['value', 'color'],
  template: '<span class="emoji" :data-color="color">{{ value }}</span>',
};
const Icon = { name: 'Icon', props: ['icon'], template: '<i class="placeholder" />' };

const mountForm = props =>
  mount(TeamForm, {
    props: { submitButtonText: 'Save', ...props },
    global: {
      stubs: { FormInput, Popover, NextButton, EmojiIcon, Icon },
      mocks: { $t: key => key },
    },
  });
const picker = wrapper => wrapper.findComponent({ name: 'EmojiIconPicker' });
const submitButton = wrapper => wrapper.find('button[type="submit"]');

describe('Team form behaviour', () => {
  beforeEach(() => {
    env.hide = vi.fn();
  });

  it('starts empty and requires a team name', async () => {
    const onSubmit = vi.fn();
    const wrapper = mountForm({ onSubmit });
    await flushPromises();
    expect(wrapper.find('.placeholder').exists()).toBe(true);
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true);
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined();
    await wrapper.find('form').trigger('submit');
    expect(onSubmit).not.toHaveBeenCalled();
    await wrapper.find('input[name="title"]').setValue('a');
    await wrapper.find('input[name="title"]').trigger('blur');
    expect(wrapper.find('input[name="title"]').attributes('data-error')).not.toBe('');
    expect(wrapper.find('input[name="description"]').attributes('data-error')).toBe('');
  });

  it('prefills a team, edits its icon and submits', async () => {
    const onSubmit = vi.fn();
    const wrapper = mountForm({
      onSubmit,
      submitInProgress: false,
      formData: {
        name: 'Support',
        description: 'Front line',
        allow_auto_assign: false,
        icon: '🎧',
        icon_color: '',
      },
    });
    await flushPromises();
    expect(wrapper.find('.emoji').text()).toBe('🎧');
    expect(picker(wrapper).props('value')).toBe('🎧');

    picker(wrapper).vm.$emit('select', { type: 'icon', value: 'i-lucide-star', color: '#f00' });
    await wrapper.vm.$nextTick();
    expect(env.hide).toHaveBeenCalledTimes(1);
    expect(wrapper.find('.emoji').attributes('data-color')).toBe('#f00');
    picker(wrapper).vm.$emit('colorChange', '#0f0');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.emoji').attributes('data-color')).toBe('#0f0');
    picker(wrapper).vm.$emit('select', { type: 'emoji', value: '🚀', color: '#00f' });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.emoji').attributes('data-color')).toBe('');

    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('form').trigger('submit');
    expect(onSubmit).toHaveBeenCalledWith({
      description: 'Front line',
      name: 'Support',
      allow_auto_assign: true,
      icon: '🚀',
      icon_color: '',
    });

    picker(wrapper).vm.$emit('remove');
    await wrapper.vm.$nextTick();
    expect(env.hide).toHaveBeenCalledTimes(3);
    expect(wrapper.find('.emoji').exists()).toBe(false);
  });

  it('disables submit while saving', () => {
    const wrapper = mountForm({ formData: { name: 'Sales' }, submitInProgress: true });
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined();
  });

  it('treats missing form data as a new team', () => {
    const wrapper = mountForm({ formData: null });
    expect(wrapper.find('input[name="title"]').element.value).toBe('');
  });
});
