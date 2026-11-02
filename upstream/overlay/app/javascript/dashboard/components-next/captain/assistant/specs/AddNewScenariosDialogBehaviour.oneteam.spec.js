/**
 * OneTeam behaviour spec for the "add new scenario" popover.
 *
 * Covers opening and closing from the button, a click outside or
 * cancel, required title, description and instruction errors, adding a
 * scenario (then resetting the form and closing), and keeping the form
 * open while it is invalid.
 */
import { mount } from '@vue/test-utils';
import AddNewScenariosDialog from '../AddNewScenariosDialog.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      env.outside = binding.value;
    },
  },
}));

const Field = name => ({
  name,
  props: ['modelValue', 'message', 'messageType', 'label'],
  emits: ['update:modelValue'],
  template: `<div class="${name}">{{ message }}</div>`,
});
const Input = Field('Input');
const TextArea = Field('TextArea');
const Editor = Field('Editor');
const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

const mountDialog = () =>
  mount(AddNewScenariosDialog, {
    global: { stubs: { Input, TextArea, Editor, Button } },
  });

const button = (wrapper, key) =>
  wrapper
    .findAllComponents(Button)
    .find(
      b => b.props('label') === `CAPTAIN.ASSISTANTS.SCENARIOS.ADD.NEW.${key}`
    );
const isOpen = wrapper => wrapper.find('h3').exists();
const fill = async (wrapper, title = 'Refunds') => {
  await wrapper.findComponent(Input).vm.$emit('update:modelValue', title);
  await wrapper.findComponent(TextArea).vm.$emit('update:modelValue', 'Asks');
  await wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Do it');
};

describe('AddNewScenariosDialog behaviour', () => {
  it('opens and closes from the button, outside clicks and cancel', async () => {
    const wrapper = mountDialog();
    expect(isOpen(wrapper)).toBe(false);
    await button(wrapper, 'CREATE').trigger('click');
    expect(isOpen(wrapper)).toBe(true);
    await button(wrapper, 'CREATE').trigger('click');
    expect(isOpen(wrapper)).toBe(false);

    await button(wrapper, 'CREATE').trigger('click');
    env.outside();
    await wrapper.vm.$nextTick();
    expect(isOpen(wrapper)).toBe(false);

    await button(wrapper, 'CREATE').trigger('click');
    await button(wrapper, 'FORM.CANCEL').trigger('click');
    expect(isOpen(wrapper)).toBe(false);
  });

  it('shows errors for missing fields and stays open', async () => {
    const wrapper = mountDialog();
    await button(wrapper, 'CREATE').trigger('click');
    expect(wrapper.findComponent(Input).props('messageType')).toBe('info');
    await button(wrapper, 'FORM.CREATE').trigger('click');
    expect(wrapper.emitted('add')).toBeUndefined();
    expect(isOpen(wrapper)).toBe(true);
    expect(
      [Input, TextArea, Editor].map(c => wrapper.findComponent(c).props())
    ).toEqual([
      expect.objectContaining({
        message: 'CAPTAIN.ASSISTANTS.SCENARIOS.ADD.NEW.FORM.TITLE.ERROR',
        messageType: 'error',
      }),
      expect.objectContaining({
        message: 'CAPTAIN.ASSISTANTS.SCENARIOS.ADD.NEW.FORM.DESCRIPTION.ERROR',
        messageType: 'error',
      }),
      expect.objectContaining({
        message: 'CAPTAIN.ASSISTANTS.SCENARIOS.ADD.NEW.FORM.INSTRUCTION.ERROR',
        messageType: 'error',
      }),
    ]);
  });

  it('adds a scenario, then resets and closes', async () => {
    const wrapper = mountDialog();
    await button(wrapper, 'CREATE').trigger('click');
    await fill(wrapper);
    await button(wrapper, 'FORM.CREATE').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('add')).toHaveLength(1);
    expect(isOpen(wrapper)).toBe(false);

    await button(wrapper, 'CREATE').trigger('click');
    expect(wrapper.findComponent(Input).props('modelValue')).toBe('');
    expect(wrapper.findComponent(Editor).props('modelValue')).toBe('');
  });
});
