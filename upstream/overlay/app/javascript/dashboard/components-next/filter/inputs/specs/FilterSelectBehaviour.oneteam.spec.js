/**
 * OneTeam behaviour spec for the filter attribute/operator dropdown.
 *
 * Covers the trigger (selected label and icon, custom label, hidden label
 * and icon, custom trigger slot), opening (clears the search), searching
 * when the list is long (whitespace queries, section headers dropped,
 * empty results), selecting an option, the empty state, and opening the
 * menu upwards when there is no room below.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import FilterSelect from '../FilterSelect.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/core', () => ({
  useElementBounding: () => env.bounds.shift() || { top: ref(0), height: ref(0) },
  useWindowSize: () => ({ height: env.windowHeight }),
}));

const Button = {
  name: 'Button',
  props: ['label', 'icon', 'trailingIcon', 'variant'],
  emits: ['click'],
  template: '<button class="trigger" @click="$emit(\'click\')">{{ label }}</button>',
};
const Item = {
  name: 'DropdownItem',
  props: { label: String, icon: String, disabled: Boolean },
  emits: ['click'],
  template: '<div class="item" @click="$emit(\'click\')">{{ label }}<slot /></div>',
};

const mountSelect = (props = {}, slots = {}) =>
  mount(FilterSelect, {
    props: {
      modelValue: 'b',
      'onUpdate:modelValue': value => env.updates.push(value),
      options: [
        { value: 'a', label: 'Alpha', icon: 'i-a' },
        { value: 'b', label: 'Beta' },
      ],
      ...props,
    },
    slots,
    global: {
      stubs: {
        Button,
        DropdownItem: Item,
        DropdownContainer: {
          template: '<div><slot name="trigger" :toggle="toggle" /><slot /></div>',
          methods: { toggle: () => env.toggles.push(true) },
        },
        DropdownBody: { template: '<div class="body"><slot /></div>' },
        DropdownSection: { template: '<ul><slot /></ul>' },
        Icon: true,
      },
    },
  });

const manyOptions = [
  { value: 'h', label: 'Standard', disabled: true },
  ...Array.from({ length: 12 }, (_, i) => ({ value: `o${i}`, label: `Option ${i}` })),
  { value: 'x', label: 'Status' },
];

describe('Filter select behaviour', () => {
  beforeEach(() => {
    env.updates = [];
    env.toggles = [];
    env.bounds = [];
    env.windowHeight = ref(1000);
  });

  it('shows the selected option on the trigger and selects another', async () => {
    const wrapper = mountSelect();
    expect(wrapper.findComponent(Button).props()).toMatchObject({
      label: 'Beta',
      icon: 'i-lucide-chevron-down',
      trailingIcon: true,
      variant: 'faded',
    });
    await wrapper.find('.trigger').trigger('click');
    expect(env.toggles).toHaveLength(1);
    await wrapper.findAll('.item')[0].trigger('click');
    expect(env.updates).toEqual(['a']);
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('uses the option icon, a fixed label or hides label and icon', () => {
    const withIcon = mountSelect({ modelValue: 'a' });
    expect(withIcon.findComponent(Button).props()).toMatchObject({ icon: 'i-a', trailingIcon: false });
    expect(mountSelect({ label: 'Fixed' }).findComponent(Button).props('label')).toBe('Fixed');
    const hidden = mountSelect({ hideLabel: true, hideIcon: true });
    expect(hidden.findComponent(Button).props()).toMatchObject({ label: null, icon: null });
  });

  it('searches long lists and drops section headers from results', async () => {
    const wrapper = mountSelect({ options: manyOptions, modelValue: 'x' });
    expect(wrapper.find('li').text()).toBe('Standard');
    const search = wrapper.find('input');
    await search.setValue('   ');
    expect(wrapper.findAll('.item')).toHaveLength(13);
    await search.setValue('status');
    expect(wrapper.findAll('.item').map(i => i.text())).toEqual(['Status']);
    expect(wrapper.find('li').exists()).toBe(false);
    await search.setValue('zzz');
    expect(wrapper.find('.item').text()).toContain('COMBOBOX.EMPTY_SEARCH_RESULTS');
    await wrapper.find('.trigger').trigger('click');
    expect(search.element.value).toBe('');
  });

  it('shows the empty state without options', () => {
    const wrapper = mountSelect({ options: [], modelValue: '' });
    expect(wrapper.find('.item').text()).toBe('COMBOBOX.EMPTY_STATE');
    expect(wrapper.findComponent(Button).props('label')).toBeUndefined();
  });

  it('accepts a custom trigger', async () => {
    const wrapper = mountSelect({}, {
      trigger: '<template #trigger="{ toggle }"><a class="custom" @click="toggle">Open</a></template>',
    });
    await wrapper.find('.custom').trigger('click');
    expect(env.toggles).toHaveLength(1);
  });

  it('opens upwards when there is not enough room below', () => {
    env.bounds = [{ top: ref(900) }, { height: ref(0) }];
    expect(mountSelect().find('.body').classes()).toContain('bottom-0');
    env.bounds = [{ top: ref(100) }, { height: ref(200) }];
    expect(mountSelect().find('.body').classes()).toContain('top-0');
  });
});
