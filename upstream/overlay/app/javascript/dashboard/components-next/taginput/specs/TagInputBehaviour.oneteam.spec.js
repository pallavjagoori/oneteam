/**
 * OneTeam behaviour spec for the tag input.
 *
 * Uses the real tag helpers and validation. Covers showing the input
 * and dropdown in single and multiple mode, adding tags with Enter or
 * a comma (plain text, email, phone, create-on-type), picking dropdown
 * items, validation highlighting, filtering text suggestions, removing
 * tags, focus and click-outside, and syncing with v-model.
 */
import { mount, flushPromises } from '@vue/test-utils';
import TagInput from '../TagInput.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (_, binding) => {
      env.outside = binding.value;
    },
  },
}));

const InlineInput = {
  name: 'InlineInput',
  props: ['modelValue', 'customInputClass', 'focusOnMount'],
  emits: [
    'update:modelValue',
    'enterPress',
    'focus',
    'input',
    'blur',
    'keydown',
  ],
  methods: { focus: () => env.focus() },
  template: '<input class="inline" />',
};
const DropdownMenu = {
  name: 'DropdownMenu',
  props: ['menuItems', 'isSearching'],
  emits: ['action'],
  template: '<ul class="menu" />',
};

const mountInput = (props = {}) =>
  mount(TagInput, {
    props,
    global: { stubs: { InlineInput, DropdownMenu } },
  });

const input = wrapper => wrapper.findComponent(InlineInput);
const menu = wrapper => wrapper.findComponent(DropdownMenu);
const type = async (wrapper, value) => {
  await input(wrapper).vm.$emit('update:modelValue', value);
  await flushPromises();
};
const enter = async wrapper => {
  input(wrapper).vm.$emit('enterPress');
  await flushPromises();
};
const tagTexts = wrapper =>
  wrapper.findAll('.bg-n-alpha-2 span:first-child').map(s => s.text());

describe('TagInput behaviour', () => {
  beforeEach(() => {
    env.focus = vi.fn();
  });

  it('adds free text tags with Enter or a comma and removes them', async () => {
    const wrapper = mountInput({ modelValue: ['one'] });
    await enter(wrapper);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await type(wrapper, ' two ');
    await enter(wrapper);
    expect(tagTexts(wrapper)).toEqual(['one', 'two']);
    // The tag list is the parent's array, updated in place.
    expect(wrapper.props('modelValue')).toEqual(['one', 'two']);
    expect(wrapper.emitted('add')).toBeUndefined();
    expect(env.focus).toHaveBeenCalled();

    await type(wrapper, 'three');
    const comma = { key: ',', preventDefault: vi.fn() };
    input(wrapper).vm.$emit('keydown', comma);
    input(wrapper).vm.$emit('keydown', { key: 'a' });
    await flushPromises();
    expect(comma.preventDefault).toHaveBeenCalled();
    expect(tagTexts(wrapper)).toEqual(['one', 'two', 'three']);

    await wrapper.findAll('.i-lucide-x')[0].trigger('click');
    expect(tagTexts(wrapper)).toEqual(['two', 'three']);
    expect(wrapper.emitted('remove')).toEqual([[0]]);
  });

  it('hides the input after a tag until focused, and on click outside', async () => {
    const wrapper = mountInput({
      modelValue: ['one'],
      autoOpenDropdown: false,
    });
    expect(input(wrapper).exists()).toBe(false);
    await wrapper.trigger('focus');
    expect(input(wrapper).exists()).toBe(true);
    expect(wrapper.emitted('focus')).toHaveLength(1);
    env.outside();
    await flushPromises();
    expect(input(wrapper).exists()).toBe(false);
    expect(wrapper.emitted('onClickOutside')).toHaveLength(1);
    await wrapper.trigger('click');
    await input(wrapper).vm.$emit('focus');
    await input(wrapper).vm.$emit('input', 'x');
    await input(wrapper).vm.$emit('blur', 'y');
    expect(wrapper.emitted('focus')).toHaveLength(3);
    expect(wrapper.emitted('input')).toEqual([['x']]);
    expect(wrapper.emitted('blur')).toEqual([['y']]);
  });

  it('follows v-model changes from the parent', async () => {
    const wrapper = mountInput({ modelValue: [] });
    await wrapper.setProps({ modelValue: ['a', 'b'] });
    expect(tagTexts(wrapper)).toEqual(['a', 'b']);
  });

  it('only adds dropdown picks for plain text with a dropdown', async () => {
    const wrapper = mountInput({
      showDropdown: true,
      menuItems: [
        { action: 'add', value: 1, label: 'Alpha' },
        { action: 'add', value: 2, label: 'Beta' },
      ],
      isLoading: true,
    });
    expect(menu(wrapper).props('isSearching')).toBe(true);
    await type(wrapper, 'alp');
    expect(
      menu(wrapper)
        .props('menuItems')
        .map(i => i.label)
    ).toEqual(['Alpha']);
    await enter(wrapper);
    expect(tagTexts(wrapper)).toEqual([]);
    await type(wrapper, '  ');
    expect(menu(wrapper).props('menuItems')).toHaveLength(2);

    menu(wrapper).vm.$emit('action', {
      action: 'add',
      value: 2,
      label: 'Beta',
    });
    await flushPromises();
    expect(wrapper.emitted('add')[0][0]).toEqual({
      phoneNumber: undefined,
      label: 'Beta',
      action: 'add',
      value: 2,
    });
    expect(tagTexts(wrapper)).toEqual(['Beta']);
    expect(
      menu(wrapper)
        .props('menuItems')
        .map(i => i.label)
    ).toEqual(['Alpha']);
  });

  it('creates new tags when allowed', async () => {
    const wrapper = mountInput({ showDropdown: true, allowCreate: true });
    await type(wrapper, 'Gamma');
    expect(menu(wrapper).props('menuItems')[0]).toMatchObject({
      label: 'Gamma',
      action: 'create',
    });
    await enter(wrapper);
    expect(wrapper.emitted('add')[0][0]).toEqual({
      value: 'Gamma',
      action: 'create',
    });
    expect(tagTexts(wrapper)).toEqual(['Gamma']);
  });

  it('validates and adds email tags', async () => {
    const wrapper = mountInput({
      type: 'email',
      showDropdown: true,
      menuItems: [
        { action: 'pick', value: 5, label: 'Ann', email: 'ann@x.test' },
      ],
    });
    expect(input(wrapper).props('customInputClass')).toBe('w-full ');
    await type(wrapper, 'not-an-email');
    expect(input(wrapper).props('customInputClass')).toContain(
      '!text-n-ruby-9'
    );
    await enter(wrapper);
    expect(tagTexts(wrapper)).toEqual([]);

    await type(wrapper, 'ann@x.test');
    await enter(wrapper);
    // The matching menu item's own value wins over the typed text.
    expect(wrapper.emitted('add')[0][0]).toEqual({
      value: 5,
      action: 'pick',
      label: 'Ann',
      email: 'ann@x.test',
    });

    menu(wrapper).vm.$emit('action', {
      email: 'bad',
      label: 'Bad',
      action: 'pick',
    });
    await flushPromises();
    expect(wrapper.emitted('add')).toHaveLength(1);
    menu(wrapper).vm.$emit('action', {
      email: 'bob@x.test',
      label: 'Bob',
      action: 'pick',
      value: 6,
    });
    await flushPromises();
    expect(wrapper.emitted('add')[1][0]).toEqual({
      email: 'bob@x.test',
      action: 'pick',
      value: 6,
    });
    expect(tagTexts(wrapper)).toEqual(['ann@x.test', 'bob@x.test']);
  });

  it('validates phone tags and dropdown picks', async () => {
    const wrapper = mountInput({ type: 'tel', showDropdown: true });
    await type(wrapper, '+44');
    expect(input(wrapper).props('customInputClass')).toContain(
      '!text-n-ruby-9'
    );
    await enter(wrapper);
    expect(tagTexts(wrapper)).toEqual([]);
    await type(wrapper, '+447400123456');
    await enter(wrapper);
    expect(wrapper.emitted('add')[0][0]).toEqual({
      value: '+447400123456',
      action: 'create',
    });

    menu(wrapper).vm.$emit('action', { phoneNumber: '+1', label: 'Bad' });
    await flushPromises();
    expect(wrapper.emitted('add')).toHaveLength(1);
    menu(wrapper).vm.$emit('action', { label: '+14155550123' });
    await flushPromises();
    expect(wrapper.emitted('add')[1][0]).toEqual({
      phoneNumber: undefined,
      label: '+14155550123',
    });
    expect(tagTexts(wrapper)).toEqual(['+447400123456', '+14155550123']);
  });

  it('keeps a single tag in single mode', async () => {
    const wrapper = mountInput({
      mode: 'single',
      showDropdown: true,
      allowCreate: true,
    });
    await type(wrapper, 'Only');
    await enter(wrapper);
    expect(tagTexts(wrapper)).toEqual(['Only']);
    expect(input(wrapper).exists()).toBe(false);
    await wrapper.trigger('focus');
    expect(input(wrapper).exists()).toBe(false);
    await wrapper.find('.i-lucide-x').trigger('click');
    expect(input(wrapper).exists()).toBe(true);
  });
});
