/**
 * OneTeam behaviour spec for the "fill required attributes before
 * resolving" dialog.
 *
 * Covers opening with each attribute type and preset values, the
 * resolve button staying disabled until every field is filled, error
 * messages for required, URL and regex rules (with and without a cue),
 * list options, submitting with the conversation context, and closing.
 */
import { mount, flushPromises } from '@vue/test-utils';
import Modal from '../ConversationResolveAttributesModal.vue';

const env = vi.hoisted(() => ({}));

const Dialog = {
  name: 'Dialog',
  props: ['disableConfirmButton'],
  emits: ['confirm', 'close'],
  methods: { open: () => env.open(), close: () => env.close() },
  template: '<div><slot /></div>',
};
const field = name => ({
  name,
  props: [
    'modelValue',
    'message',
    'messageType',
    'options',
    'hasError',
    'type',
  ],
  emits: ['update:modelValue', 'blur'],
  template: `<div class="${name}" />`,
});
const TextArea = field('TextArea');
const Input = field('Input');
const ComboBox = field('ComboBox');
const ChoiceToggle = field('ChoiceToggle');

const attributes = [
  { value: 'notes', label: 'Notes', type: 'text' },
  { value: 'count', label: 'Count', type: 'number' },
  { value: 'site', label: 'Site', type: 'link' },
  { value: 'due', label: 'Due', type: 'date' },
  { value: 'plan', label: 'Plan', type: 'list', attributeValues: ['a', 'b'] },
  { value: 'vip', label: 'VIP', type: 'checkbox' },
];

const mountModal = () =>
  mount(Modal, {
    global: { stubs: { Dialog, TextArea, Input, ComboBox, ChoiceToggle } },
  });

const dialog = wrapper => wrapper.findComponent(Dialog);
const setValue = async (wrapper, component, value) => {
  await component.vm.$emit('update:modelValue', value);
  await flushPromises();
};

describe('ConversationResolveAttributesModal behaviour', () => {
  beforeEach(() => {
    env.open = vi.fn();
    env.close = vi.fn();
  });

  it('opens empty with every field type', async () => {
    const wrapper = mountModal();
    wrapper.vm.open(attributes);
    await flushPromises();
    expect(env.open).toHaveBeenCalled();
    expect(
      wrapper.findAllComponents(Input).map(i => i.props('modelValue'))
    ).toEqual(['', '', '']);
    expect(wrapper.findComponent(TextArea).props('modelValue')).toBe('');
    expect(wrapper.findComponent(ComboBox).props('options')).toEqual([
      { value: 'a', label: 'a' },
      { value: 'b', label: 'b' },
    ]);
    expect(wrapper.findComponent(ChoiceToggle).props('modelValue')).toBeNull();
    expect(dialog(wrapper).props('disableConfirmButton')).toBe(true);
    expect(wrapper.text()).toContain('VIP');
  });

  it('shows required, URL and regex errors', async () => {
    const wrapper = mountModal();
    wrapper.vm.open([
      ...attributes,
      {
        value: 'code',
        type: 'number',
        regexPattern: '/^\\d+$/',
        regexCue: 'Digits only',
      },
      { value: 'ref', type: 'date', regexPattern: '/^R/' },
      { value: 'odd', type: 'unknown' },
      { value: 'empty', type: 'list' },
    ]);
    await flushPromises();
    await dialog(wrapper).vm.$emit('confirm');
    await flushPromises();
    const inputs = wrapper.findAllComponents(Input);
    expect(wrapper.findComponent(TextArea).props()).toMatchObject({
      message: 'CUSTOM_ATTRIBUTES.VALIDATIONS.REQUIRED',
      messageType: 'error',
    });
    expect(wrapper.findComponent(ComboBox).props('hasError')).toBe(true);
    expect(wrapper.findAllComponents(ComboBox)[1].props('options')).toEqual([]);
    expect(wrapper.emitted('submit')).toBeUndefined();

    await setValue(wrapper, inputs[1], 'not a url');
    expect(wrapper.findAllComponents(Input)[1].props('message')).toBe(
      'CUSTOM_ATTRIBUTES.VALIDATIONS.INVALID_URL'
    );
    await setValue(wrapper, inputs[3], 'abc');
    expect(wrapper.findAllComponents(Input)[3].props('message')).toBe(
      'Digits only'
    );
    await setValue(wrapper, inputs[4], 'X1');
    expect(wrapper.findAllComponents(Input)[4].props('message')).toBe(
      'CUSTOM_ATTRIBUTES.VALIDATIONS.INVALID_INPUT'
    );
    await setValue(wrapper, inputs[3], '42');
    expect(wrapper.findAllComponents(Input)[3].props()).toMatchObject({
      message: '',
      messageType: 'info',
    });
  });

  it('touches fields on blur', async () => {
    const wrapper = mountModal();
    wrapper.vm.open(attributes);
    await flushPromises();
    await wrapper.findComponent(TextArea).vm.$emit('blur');
    await Promise.all(
      wrapper.findAllComponents(Input).map(i => i.vm.$emit('blur'))
    );
    await flushPromises();
    expect(wrapper.findComponent(TextArea).props('messageType')).toBe('error');
    expect(
      wrapper.findAllComponents(Input).map(i => i.props('messageType'))
    ).toEqual(['error', 'error', 'error']);
  });

  it('submits filled values with the context and closes', async () => {
    const wrapper = mountModal();
    wrapper.vm.open(
      attributes,
      { notes: 'Hi', count: 0, plan: null, vip: false },
      { id: 9 }
    );
    await flushPromises();
    expect(wrapper.findComponent(TextArea).props('modelValue')).toBe('Hi');
    expect(wrapper.findComponent(ChoiceToggle).props('modelValue')).toBe(false);
    const inputs = wrapper.findAllComponents(Input);
    await setValue(wrapper, inputs[1], 'https://acme.test');
    expect(dialog(wrapper).props('disableConfirmButton')).toBe(true);
    await setValue(wrapper, inputs[2], '2026-01-01');
    await setValue(wrapper, wrapper.findComponent(ComboBox), 'b');
    expect(dialog(wrapper).props('disableConfirmButton')).toBe(false);
    await dialog(wrapper).vm.$emit('confirm');
    await flushPromises();
    expect(wrapper.emitted('submit')[0][0]).toEqual({
      attributes: {
        notes: 'Hi',
        count: 0,
        site: 'https://acme.test',
        due: '2026-01-01',
        plan: 'b',
        vip: false,
      },
      context: { id: 9 },
    });
    expect(env.close).toHaveBeenCalled();

    await dialog(wrapper).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('clears old values when reopened and closes on request', async () => {
    const wrapper = mountModal();
    wrapper.vm.open(attributes, { notes: 'Old' });
    await flushPromises();
    wrapper.vm.open([attributes[0]]);
    await flushPromises();
    expect(wrapper.findComponent(TextArea).props('modelValue')).toBe('');
    wrapper.vm.open();
    await flushPromises();
    expect(dialog(wrapper).props('disableConfirmButton')).toBe(false);
    wrapper.vm.close();
    expect(env.close).toHaveBeenCalled();
  });
});
