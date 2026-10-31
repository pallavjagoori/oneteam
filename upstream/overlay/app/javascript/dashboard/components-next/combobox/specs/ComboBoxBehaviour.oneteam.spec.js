/**
 * OneTeam behaviour spec for the single-select combobox.
 *
 * Covers the placeholder and display-label fallbacks, opening and closing
 * (including when disabled and on an outside click), local and API search,
 * selecting and unselecting options, syncing with v-model, and the error
 * colour and helper message.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ComboBox from '../ComboBox.vue';

vi.mock('@vueuse/components', () => ({
  OnClickOutside: {
    name: 'OnClickOutside',
    emits: ['trigger'],
    template: '<div class="outside"><slot /></div>',
  },
}));

const Button = {
  name: 'Button',
  props: ['label', 'color', 'icon', 'disabled'],
  emits: ['click'],
  template:
    '<button :data-color="color" :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
};
const focus = vi.fn();
const ComboBoxDropdown = {
  name: 'ComboBoxDropdown',
  props: [
    'open',
    'options',
    'searchValue',
    'selectedValues',
    'searchPlaceholder',
    'emptyState',
  ],
  emits: ['update:searchValue', 'search', 'select'],
  methods: { focus },
  template:
    '<ul v-if="open"><li v-for="o in options" :key="o.value">{{ o.label }}</li></ul>',
};

const options = [
  { value: 1, label: 'Sales' },
  { value: 2, label: 'Support' },
  { value: 3, label: 'Billing' },
];

const mountBox = props =>
  mount(ComboBox, {
    props: { options, ...props },
    global: { stubs: { Button, ComboBoxDropdown } },
  });
const button = wrapper => wrapper.find('button');
const dropdown = wrapper => wrapper.findComponent(ComboBoxDropdown);

describe('ComboBox behaviour', () => {
  it('falls back to the display label and then the placeholder', () => {
    expect(button(mountBox()).text()).toBe('COMBOBOX.PLACEHOLDER');
    expect(button(mountBox({ placeholder: 'Pick a team' })).text()).toBe(
      'Pick a team'
    );
    expect(
      button(mountBox({ modelValue: 9, displayLabel: 'Legacy' })).text()
    ).toBe('Legacy');
    expect(button(mountBox({ modelValue: 2 })).text()).toBe('Support');
  });

  it('opens, focuses the search and closes again', async () => {
    const wrapper = mountBox();
    expect(button(wrapper).attributes('data-color')).toBe('slate');
    expect(button(wrapper).attributes('data-icon')).toBe(
      'i-lucide-chevron-down'
    );
    await button(wrapper).trigger('click');
    await flushPromises();
    expect(dropdown(wrapper).props('open')).toBe(true);
    expect(wrapper.emitted('open')).toHaveLength(1);
    expect(focus).toHaveBeenCalled();
    expect(button(wrapper).attributes('data-color')).toBe('blue');
    expect(button(wrapper).attributes('data-icon')).toBe('i-lucide-chevron-up');
    await button(wrapper).trigger('click');
    expect(dropdown(wrapper).props('open')).toBe(false);
    await button(wrapper).trigger('click');
    await wrapper.findComponent({ name: 'OnClickOutside' }).vm.$emit('trigger');
    expect(dropdown(wrapper).props('open')).toBe(false);
    expect(wrapper.emitted('open')).toHaveLength(2);
  });

  it('stays closed when disabled', async () => {
    const wrapper = mountBox({ disabled: true });
    await button(wrapper).trigger('click');
    expect(dropdown(wrapper).props('open')).toBe(false);
    expect(wrapper.find('div').classes()).toContain('cursor-not-allowed');
  });

  it('filters options locally', async () => {
    const wrapper = mountBox();
    await button(wrapper).trigger('click');
    await dropdown(wrapper).vm.$emit('update:searchValue', 'SU');
    expect(dropdown(wrapper).props('options')).toEqual([options[1]]);
    await dropdown(wrapper).vm.$emit('search', 'su');
    expect(wrapper.emitted('search')).toEqual([['su']]);
  });

  it('keeps API results unfiltered while searching', async () => {
    const wrapper = mountBox({ useApiResults: true });
    await dropdown(wrapper).vm.$emit('update:searchValue', 'zzz');
    expect(dropdown(wrapper).props('options')).toEqual(options);
  });

  it('selects, unselects and follows v-model', async () => {
    const wrapper = mountBox();
    await button(wrapper).trigger('click');
    await dropdown(wrapper).vm.$emit('update:searchValue', 'bill');
    await dropdown(wrapper).vm.$emit('select', options[2]);
    expect(wrapper.emitted('update:modelValue')).toEqual([[3]]);
    expect(button(wrapper).text()).toBe('Billing');
    expect(dropdown(wrapper).props('open')).toBe(false);
    expect(dropdown(wrapper).props('searchValue')).toBe('');
    await dropdown(wrapper).vm.$emit('select', options[2]);
    expect(wrapper.emitted('update:modelValue')[1]).toEqual(['']);
    await wrapper.setProps({ modelValue: 1 });
    expect(button(wrapper).text()).toBe('Sales');
    expect(dropdown(wrapper).props('selectedValues')).toBe(1);
  });

  it('shows the error colour and helper message', async () => {
    const wrapper = mountBox({ hasError: true, message: 'Required' });
    expect(button(wrapper).attributes('data-color')).toBe('ruby');
    expect(wrapper.find('p').text()).toBe('Required');
    expect(wrapper.find('p').classes()).toContain('text-n-ruby-9');
    await wrapper.setProps({ hasError: false });
    expect(wrapper.find('p').classes()).toContain('text-n-slate-11');
    expect(mountBox().find('p').exists()).toBe(false);
  });
});
