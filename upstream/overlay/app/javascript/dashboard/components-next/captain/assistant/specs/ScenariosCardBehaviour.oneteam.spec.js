/**
 * OneTeam behaviour spec for a Captain assistant scenario card.
 *
 * Covers the read view (title, description, enabled/disabled label,
 * formatted instruction, tools used), selecting the card, toggling it on
 * or off, hover and delete events, expanding long instructions (and not
 * short ones), and editing: prefill, validation messages, cancelling and
 * saving the updated scenario.
 */
import { flushPromises, mount } from '@vue/test-utils';
import ScenariosCard from '../ScenariosCard.vue';

const env = vi.hoisted(() => ({ height: null }));

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: initial => {
      const state = appRef(initial);
      const toggle = value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      };
      return [state, toggle];
    },
    useElementSize: () => {
      env.height = appRef(0);
      return { height: env.height };
    },
  };
});
vi.mock('shared/composables/useMessageFormatter', () => ({
  useMessageFormatter: () => ({ formatMessage: text => `<b>${text}</b>` }),
}));

const field = (name, extra = '') => ({
  name,
  props: ['modelValue', 'message', 'messageType'],
  emits: ['update:modelValue'],
  template: `<div class="${name}" :data-message="message" :data-type="messageType"><input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />${extra}</div>`,
});
const Button = {
  name: 'NextButton',
  props: ['icon', 'label'],
  emits: ['click'],
  template: '<button :data-icon="icon" :data-label="label" @click="$emit(\'click\')" />',
};
const Switch = {
  name: 'Switch',
  props: { modelValue: Boolean, disabled: Boolean },
  emits: ['update:modelValue'],
  template: '<input type="checkbox" class="switch" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
};
const Checkbox = {
  name: 'Checkbox',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input type="checkbox" class="select" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
};

const mountCard = props =>
  mount(ScenariosCard, {
    props: {
      id: 3,
      title: 'Refunds',
      description: 'Handle refund requests',
      instruction: 'Check the order',
      ...props,
    },
    global: {
      stubs: {
        Input: field('Input'),
        TextArea: field('TextArea'),
        Editor: field('Editor'),
        NextButton: Button,
        Button,
        Switch,
        Checkbox,
        Icon: true,
        CardLayout: { template: '<div class="card"><slot /></div>' },
        Policy: { template: '<span><slot /></span>' },
      },
      directives: {
        dompurifyHtml: {
          mounted: (el, binding) => {
            el.innerHTML = binding.value;
          },
        },
      },
    },
  });
const button = (wrapper, key) =>
  wrapper.find(`[data-icon="${key}"]`).exists()
    ? wrapper.find(`[data-icon="${key}"]`)
    : wrapper.find(`[data-label="${key}"]`);
const expandable = wrapper => wrapper.find('.group\\/expandable');

describe('Captain scenarios card behaviour', () => {
  it('shows the scenario and relays select, toggle, hover and delete', async () => {
    const wrapper = mountCard({ tools: ['search', 'refund'], selectable: true, isUpdating: true });
    expect(wrapper.text()).toContain('Refunds');
    expect(wrapper.text()).toContain('CAPTAIN.ASSISTANTS.SCENARIOS.STATUS.ENABLED');
    expect(wrapper.find('p').html()).toContain('<b>Check the order</b>');
    expect(wrapper.text()).toContain('@search, @refund');
    expect(wrapper.find('.switch').attributes('disabled')).toBeDefined();

    await wrapper.find('.select').setValue(true);
    expect(wrapper.emitted('select')).toEqual([[3]]);
    wrapper.findComponent(Switch).vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('toggle')).toEqual([[{ id: 3, enabled: false }]]);
    await wrapper.find('.card').trigger('mouseenter');
    await wrapper.find('.card').trigger('mouseleave');
    expect(wrapper.emitted('hover')).toEqual([[true], [false]]);
    await button(wrapper, 'i-lucide-trash').trigger('click');
    expect(wrapper.emitted('delete')).toEqual([[3]]);
  });

  it('labels disabled scenarios and hides the tools line without tools', () => {
    const wrapper = mountCard({ enabled: false });
    expect(wrapper.text()).toContain('CAPTAIN.ASSISTANTS.SCENARIOS.STATUS.DISABLED');
    expect(wrapper.text()).not.toContain('TOOLS_USED');
  });

  it('expands long instructions only', async () => {
    const wrapper = mountCard();
    await expandable(wrapper).trigger('click');
    expect(expandable(wrapper).attributes('style')).toContain('max-height: 10rem');
    env.height.value = 300;
    await flushPromises();
    expect(expandable(wrapper).classes()).toContain('cursor-pointer');
    await expandable(wrapper).trigger('click');
    expect(expandable(wrapper).attributes('style')).toContain('max-height: 300px');
  });

  it('edits, validates and saves the scenario', async () => {
    const wrapper = mountCard({ tools: ['search'] });
    await button(wrapper, 'i-lucide-pen').trigger('click');
    expect(wrapper.find('.Input input').element.value).toBe('Refunds');
    await button(wrapper, 'CAPTAIN.ASSISTANTS.SCENARIOS.UPDATE.CANCEL').trigger('click');
    expect(wrapper.find('.Input').exists()).toBe(false);

    await button(wrapper, 'i-lucide-pen').trigger('click');
    await wrapper.find('.Input input').setValue('');
    await wrapper.find('.TextArea input').setValue('');
    await wrapper.find('.Editor input').setValue('');
    await button(wrapper, 'CAPTAIN.ASSISTANTS.SCENARIOS.UPDATE.UPDATE').trigger('click');
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(wrapper.find('.Input').attributes('data-type')).toBe('error');
    expect(wrapper.find('.TextArea').attributes('data-message')).toBe(
      'CAPTAIN.ASSISTANTS.SCENARIOS.ADD.NEW.FORM.DESCRIPTION.ERROR'
    );
    expect(wrapper.find('.Editor').attributes('data-message')).toBe(
      'CAPTAIN.ASSISTANTS.SCENARIOS.ADD.NEW.FORM.INSTRUCTION.ERROR'
    );

    await wrapper.find('.Input input').setValue('Returns');
    await wrapper.find('.TextArea input').setValue('Handle returns');
    await wrapper.find('.Editor input').setValue('Ask for the order id');
    expect(wrapper.find('.Input').attributes('data-type')).toBe('info');
    await button(wrapper, 'CAPTAIN.ASSISTANTS.SCENARIOS.UPDATE.UPDATE').trigger('click');
    expect(wrapper.emitted('update')).toEqual([
      [
        {
          id: 3,
          title: 'Returns',
          description: 'Handle returns',
          instruction: 'Ask for the order id',
          tools: ['search'],
        },
      ],
    ]);
    expect(wrapper.find('.Input').exists()).toBe(false);
  });
});
