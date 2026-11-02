/**
 * OneTeam behaviour spec for the multi-value text input used in filters.
 *
 * Covers showing the input when empty, adding trimmed values with Enter
 * (refocusing the input) or on blur (blank drafts ignored), hiding the
 * input once values exist until the field is focused or clicked again,
 * and removing a value without refocusing the field.
 */
import { flushPromises, mount } from '@vue/test-utils';
import MultiTextInput from '../MultiTextInput.vue';

const env = vi.hoisted(() => ({ focus: null }));

const InlineInput = {
  name: 'InlineInput',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue', 'enterPress', 'blur'],
  methods: {
    focus() {
      env.focus();
    },
  },
  template: '<input class="draft" :placeholder="placeholder" />',
};

const mountInput = (modelValue = []) => {
  const wrapper = mount(MultiTextInput, {
    props: {
      modelValue,
      placeholder: 'Add a value',
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
    },
    global: { stubs: { InlineInput } },
  });
  return wrapper;
};

const input = wrapper => wrapper.findComponent(InlineInput);
const chips = wrapper => wrapper.findAll('.truncate').map(c => c.text());

describe('MultiTextInput behaviour', () => {
  beforeEach(() => {
    env.focus = vi.fn();
  });

  it('adds values with Enter and on blur', async () => {
    const wrapper = mountInput();
    expect(wrapper.classes()).toContain('px-3');
    expect(input(wrapper).props('placeholder')).toBe('Add a value');
    await wrapper.trigger('focus');
    await flushPromises();
    env.focus.mockClear();

    await input(wrapper).vm.$emit('update:modelValue', '  vip ');
    await input(wrapper).vm.$emit('enterPress');
    expect(chips(wrapper)).toEqual(['vip']);
    expect(env.focus).toHaveBeenCalledTimes(1);
    expect(input(wrapper).props('modelValue')).toBe('');

    await input(wrapper).vm.$emit('update:modelValue', '   ');
    await input(wrapper).vm.$emit('enterPress');
    expect(chips(wrapper)).toEqual(['vip']);

    await input(wrapper).vm.$emit('update:modelValue', 'trial');
    await input(wrapper).vm.$emit('blur');
    expect(chips(wrapper)).toEqual(['vip', 'trial']);
    expect(input(wrapper).exists()).toBe(false);
    expect(wrapper.classes()).toContain('px-[0.1875rem]');
  });

  it('shows the input again on focus or click', async () => {
    const wrapper = mountInput(['vip']);
    expect(input(wrapper).exists()).toBe(false);
    await wrapper.trigger('focus');
    await flushPromises();
    expect(input(wrapper).exists()).toBe(true);
    expect(env.focus).toHaveBeenCalled();

    await input(wrapper).vm.$emit('blur');
    expect(input(wrapper).exists()).toBe(false);
    await wrapper.trigger('click');
    await flushPromises();
    expect(input(wrapper).exists()).toBe(true);
  });

  it('removes a value without focusing the field', async () => {
    const wrapper = mountInput(['vip', 'trial', 'lead']);
    await wrapper.findAll('.i-lucide-x')[1].trigger('click');
    expect(chips(wrapper)).toEqual(['vip', 'lead']);
    expect(input(wrapper).exists()).toBe(false);
    expect(env.focus).not.toHaveBeenCalled();
  });

  it('defaults to no values', () => {
    const wrapper = mount(MultiTextInput, {
      global: { stubs: { InlineInput } },
    });
    expect(input(wrapper).exists()).toBe(true);
    expect(chips(wrapper)).toEqual([]);
  });
});
