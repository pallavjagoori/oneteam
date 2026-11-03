/**
 * OneTeam behaviour spec for the WhatsApp campaign schedule popover.
 *
 * Covers the trigger button, picking a date (bound to the model, past
 * dates disabled), cancelling, confirming (hides and emits), the busy
 * state, and hiding the actions.
 */
import { mount } from '@vue/test-utils';
import SchedulePopover from '../SchedulePopover.vue';

const hide = vi.fn();
const Popover = {
  name: 'Popover',
  setup: () => ({ hide }),
  template: '<div><slot /><slot name="content" :hide="hide" /></div>',
};
const Button = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading', 'variant', 'color'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'min'],
  emits: ['update:modelValue'],
  template: '<input />',
};

let wrapper;
const mountPopover = props => {
  wrapper = mount(SchedulePopover, {
    props: {
      buttonLabel: 'Schedule',
      confirmLabel: 'Confirm',
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
      ...props,
    },
    global: { stubs: { Popover, Button, Input } },
  });
  return wrapper;
};
const buttons = () => wrapper.findAllComponents(Button);

describe('SchedulePopover behaviour', () => {
  it('schedules a future date and confirms', async () => {
    mountPopover({ isDisabled: true, variant: 'faded', color: 'slate' });
    expect(buttons()[0].props()).toMatchObject({
      label: 'Schedule',
      disabled: true,
      variant: 'faded',
      color: 'slate',
    });
    expect(wrapper.findComponent(Input).props('min')).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
    );
    expect(buttons()[2].props('disabled')).toBe(true);

    wrapper
      .findComponent(Input)
      .vm.$emit('update:modelValue', '2999-01-01T10:00');
    await wrapper.vm.$nextTick();
    expect(buttons()[2].props('disabled')).toBe(false);
    await buttons()[1].trigger('click');
    expect(hide).toHaveBeenCalledTimes(1);
    await buttons()[2].trigger('click');
    expect(hide).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('shows a busy confirm and can hide the actions', async () => {
    mountPopover({ isLoading: true, modelValue: '2999-01-01T10:00' });
    expect(buttons()[2].props()).toMatchObject({
      isLoading: true,
      disabled: true,
    });
    await wrapper.setProps({ showActions: false });
    expect(buttons()).toHaveLength(1);
  });
});
