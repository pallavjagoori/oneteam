/**
 * OneTeam behaviour spec for the "new company" dialog.
 *
 * Covers opening it empty or prefilled from a company, requiring a name
 * (the save button stays disabled and confirm does nothing), the create
 * payload (trimmed, with blank domain and description sent as null), the
 * loading state, cancelling, resetting when the dialog closes, and the
 * exposed `onSuccess` that clears and closes the form.
 */
import { mount } from '@vue/test-utils';
import CompanyCreateDialog from '../CompanyCreateDialog.vue';

const env = vi.hoisted(() => ({ log: [] }));

const Dialog = {
  name: 'Dialog',
  emits: ['confirm', 'close'],
  methods: {
    open() {
      env.log.push('open');
    },
    close() {
      env.log.push('close');
    },
  },
  template: '<div><slot /><slot name="footer" /></div>',
};
const field = name => ({
  name,
  props: ['modelValue', 'disabled'],
  emits: ['update:modelValue'],
  template: `<input class="${name}" :value="modelValue" :disabled="disabled" @input="$emit('update:modelValue', $event.target.value)" />`,
});
const Input = field('Input');
const TextArea = field('TextArea');
const Button = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
};

const mountDialog = (props = {}) =>
  mount(CompanyCreateDialog, {
    props,
    global: { stubs: { Dialog, Input, TextArea, Button, NextButton: Button } },
  });

const values = wrapper => [
  ...wrapper.findAll('.Input').map(i => i.element.value),
  wrapper.find('.TextArea').element.value,
];
const save = wrapper => wrapper.find('button[type="submit"]');

describe('CompanyCreateDialog behaviour', () => {
  beforeEach(() => {
    env.log = [];
  });

  it('opens empty or prefilled', async () => {
    const wrapper = mountDialog();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(values(wrapper)).toEqual(['', '', '']);
    wrapper.vm.open({
      name: 'Acme',
      domain: 'acme.io',
      description: 'Rockets',
    });
    await wrapper.vm.$nextTick();
    expect(values(wrapper)).toEqual(['Acme', 'acme.io', 'Rockets']);
    expect(env.log).toEqual(['open', 'open']);
    expect(save(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('needs a name before creating', async () => {
    const wrapper = mountDialog();
    await wrapper.find('.Input').setValue('   ');
    expect(save(wrapper).attributes('disabled')).toBeDefined();
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    expect(wrapper.emitted('create')).toBeUndefined();
  });

  it('creates a trimmed company with blank fields as null', async () => {
    const wrapper = mountDialog();
    const [name, domain] = wrapper.findAll('.Input');
    await name.setValue('  Acme ');
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    expect(wrapper.emitted('create')[0][0]).toEqual({
      name: 'Acme',
      domain: null,
      description: null,
    });

    await domain.setValue(' acme.io ');
    await wrapper.find('.TextArea').setValue(' Rockets ');
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    expect(wrapper.emitted('create')[1][0]).toEqual({
      name: 'Acme',
      domain: 'acme.io',
      description: 'Rockets',
    });

    wrapper.vm.onSuccess();
    await wrapper.vm.$nextTick();
    expect(values(wrapper)).toEqual(['', '', '']);
    expect(env.log).toEqual(['close']);
  });

  it('disables the form while saving, cancels and resets on close', async () => {
    const wrapper = mountDialog({ isLoading: true });
    await wrapper.findComponent(Input).vm.$emit('update:modelValue', 'Acme');
    expect(wrapper.find('.Input').attributes('disabled')).toBeDefined();
    expect(save(wrapper).attributes('disabled')).toBeDefined();
    expect(wrapper.findAllComponents(Button)[1].props('isLoading')).toBe(true);

    await wrapper.find('button[type="reset"]').trigger('click');
    expect(env.log).toEqual(['close']);
    wrapper.findComponent(Dialog).vm.$emit('close');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(Input).props('modelValue')).toBe('');
  });
});
