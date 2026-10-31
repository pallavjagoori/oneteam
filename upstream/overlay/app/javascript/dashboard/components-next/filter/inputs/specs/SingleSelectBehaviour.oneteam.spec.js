/**
 * OneTeam behaviour spec for the filter single-select input.
 *
 * Covers the placeholder (default and custom, with its icon), the selected
 * button with icon or emoji, array and async fallbacks for the selection,
 * local search (no results and empty states), async search with its
 * searching state, hiding search, and selecting, deselecting and
 * disabled deselection.
 */
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import SingleSelect from '../SingleSelect.vue';

const env = vi.hoisted(() => ({}));

const Container = {
  name: 'DropdownContainer',
  template: '<div><slot name="trigger" :toggle="toggle" /><slot /></div>',
  methods: { toggle: () => env.toggle() },
};
const Item = {
  name: 'DropdownItem',
  props: ['icon', 'disabled'],
  emits: ['click'],
  template:
    '<div class="option" :class="{ disabled }"><slot name="icon" /><slot name="label" /><slot /></div>',
};
const NextButton = {
  name: 'Button',
  props: ['label', 'icon', 'trailingIcon'],
  emits: ['click'],
  template:
    '<button :data-trailing="String(!!trailingIcon)" @click="$emit(`click`)"><slot name="icon" />{{ label }}<slot /></button>',
};

const mountSelect = (props = {}) =>
  mount(SingleSelect, {
    props: { options: [], modelValue: null, ...props },
    attachTo: document.body,
    global: {
      stubs: {
        DropdownContainer: Container,
        DropdownBody: { template: '<div><slot /></div>' },
        DropdownSection: { template: '<div><slot /></div>' },
        DropdownItem: Item,
        Button: NextButton,
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
        EmojiIcon: {
          props: ['value'],
          template: '<b class="emoji">{{ value }}</b>',
        },
      },
    },
  });

const icon = h('svg');
const options = [
  { id: 1, name: 'Open', icon },
  { id: 2, name: 'Sales', emoji: '💰', iconColor: 'red' },
  { id: 3, name: 'Pending' },
];
const rows = wrapper => wrapper.findAll('.option');
const lastValue = wrapper => wrapper.emitted('update:modelValue').at(-1)[0];

describe('Filter SingleSelect behaviour', () => {
  let wrapper;
  beforeEach(() => {
    env.toggle = vi.fn();
  });
  afterEach(() => wrapper?.unmount());

  it('shows the placeholder and empty state', async () => {
    wrapper = mountSelect();
    const button = wrapper.find('button');
    expect(button.text()).toBe('COMBOBOX.PLACEHOLDER');
    expect(button.find('i').classes()).toContain('i-lucide-plus');
    expect(button.attributes('data-trailing')).toBe('false');
    expect(rows(wrapper)[0].text()).toBe('COMBOBOX.EMPTY_STATE');
    expect(wrapper.find('input').attributes('placeholder')).toBe(
      'COMBOBOX.SEARCH_PLACEHOLDER'
    );
    expect(document.activeElement).toBe(wrapper.find('input').element);
    await button.trigger('click');
    expect(env.toggle).toHaveBeenCalled();
  });

  it('uses a custom placeholder, icon and search text', () => {
    wrapper = mountSelect({
      placeholder: 'Pick status',
      placeholderIcon: 'i-lucide-flag',
      placeholderTrailingIcon: true,
      searchPlaceholder: 'Find',
      options: null,
    });
    const button = wrapper.find('button');
    expect(button.text()).toBe('Pick status');
    expect(button.find('i').classes()).toContain('i-lucide-flag');
    expect(button.attributes('data-trailing')).toBe('true');
    expect(wrapper.find('input').attributes('placeholder')).toBe('Find');
    expect(rows(wrapper)[0].text()).toBe('COMBOBOX.EMPTY_STATE');
  });

  it('shows the selected option with its icon or emoji', async () => {
    wrapper = mountSelect({ options, modelValue: { id: 1 } });
    expect(wrapper.find('button').text()).toBe('Open');
    expect(wrapper.find('button .emoji').exists()).toBe(false);
    expect(rows(wrapper)[0].find('.i-lucide-check').exists()).toBe(true);
    await wrapper.setProps({ modelValue: [{ id: 2 }] });
    expect(wrapper.find('button').text()).toBe('💰Sales');
    expect(rows(wrapper)[1].find('.emoji').exists()).toBe(true);
    await wrapper.setProps({ modelValue: [] });
    expect(wrapper.find('button').text()).toBe('COMBOBOX.PLACEHOLDER');
    await wrapper.setProps({ modelValue: { id: 99 } });
    expect(wrapper.find('button').text()).toBe('COMBOBOX.PLACEHOLDER');
  });

  it('falls back to the selection for async options', async () => {
    wrapper = mountSelect({
      options: [],
      asyncSearch: true,
      modelValue: { id: 7, name: 'Remote' },
    });
    expect(wrapper.find('button').text()).toBe('Remote');
    await wrapper.setProps({ modelValue: { name: 'No id' } });
    expect(wrapper.find('button').text()).toBe('COMBOBOX.PLACEHOLDER');
  });

  it('searches locally and shows no results', async () => {
    wrapper = mountSelect({ options });
    expect(rows(wrapper)).toHaveLength(3);
    await wrapper.find('input').setValue('pend');
    expect(rows(wrapper).map(r => r.text())).toEqual(['Pending']);
    expect(wrapper.emitted('search')).toEqual([['pend']]);
    await wrapper.find('input').setValue('zzz');
    expect(rows(wrapper)[0].text()).toBe('COMBOBOX.EMPTY_SEARCH_RESULTS');
  });

  it('keeps async results and shows the searching state', async () => {
    wrapper = mountSelect({ options, asyncSearch: true });
    await wrapper.find('input').setValue('zzz');
    expect(rows(wrapper)).toHaveLength(3);
    await wrapper.setProps({ isSearching: true });
    expect(rows(wrapper)[0].text()).toBe('DROPDOWN_MENU.SEARCHING');
  });

  it('hides search when disabled', () => {
    wrapper = mountSelect({ options, disableSearch: true });
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('selects and deselects options', async () => {
    wrapper = mountSelect({ options });
    const items = () => wrapper.findAllComponents(Item);
    await items()[0].vm.$emit('click');
    expect(lastValue(wrapper)).toEqual({ id: 1, name: 'Open' });
    await wrapper.setProps({ modelValue: { id: 1, name: 'Open' } });
    await items()[0].vm.$emit('click');
    expect(lastValue(wrapper)).toBeNull();
  });

  it('keeps the selection when deselecting is disabled', async () => {
    wrapper = mountSelect({
      options,
      modelValue: { id: 3, name: 'Pending' },
      disableDeselect: true,
    });
    await wrapper.findAllComponents(Item)[2].vm.$emit('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
