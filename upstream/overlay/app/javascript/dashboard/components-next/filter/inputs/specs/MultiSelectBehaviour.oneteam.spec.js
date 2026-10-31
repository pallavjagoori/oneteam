/**
 * OneTeam behaviour spec for the filter multi-select input.
 *
 * Covers the empty placeholder, chips with icons, emoji and colours,
 * the "+N more" chip (and showing one extra chip instead of "+1"),
 * toggling options on and off, searching long lists (including blank
 * and no-match searches), and the empty state.
 */
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import MultiSelect from '../MultiSelect.vue';

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
  emits: ['click'],
  template:
    '<button class="placeholder" @click="$emit(`click`)"><slot name="icon" /><slot /></button>',
};

const mountSelect = (props = {}) =>
  mount(MultiSelect, {
    props: { options: [], modelValue: [], ...props },
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
      directives: {
        tooltip: {
          mounted: (el, binding) => el.setAttribute('data-tip', binding.value),
        },
      },
    },
  });

const options = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: `Option ${i + 1}`,
}));
const chips = wrapper =>
  wrapper.findAll('button.bg-n-alpha-2 > div').map(d => d.text());
const lastValue = wrapper => wrapper.emitted('update:modelValue').at(-1)[0];

describe('Filter MultiSelect behaviour', () => {
  beforeEach(() => {
    env.toggle = vi.fn();
  });

  it('shows the placeholder and empty state', async () => {
    [[], '', 'text'].forEach(modelValue => {
      const wrapper = mountSelect({ modelValue });
      expect(wrapper.find('.placeholder').text()).toContain(
        'COMBOBOX.PLACEHOLDER'
      );
    });
    const wrapper = mountSelect();
    expect(wrapper.find('.option').text()).toBe('COMBOBOX.EMPTY_STATE');
    await wrapper.find('.placeholder').trigger('click');
    expect(env.toggle).toHaveBeenCalled();
  });

  it('shows chips with icons, emoji and colours', async () => {
    const icon = h('svg');
    const rich = [
      { id: 1, name: 'Bug', icon },
      { id: 2, name: 'Sales', emoji: '💰', iconColor: 'red' },
      { id: 3, name: 'VIP', color: '#f00' },
    ];
    const wrapper = mountSelect({
      options: rich,
      modelValue: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    expect(chips(wrapper)).toEqual(['Bug', '💰Sales', 'VIP', '']);
    expect(wrapper.find('button.bg-n-alpha-2 .rounded-full').exists()).toBe(
      true
    );
    const optionTexts = wrapper.findAll('.option').map(o => o.text());
    expect(optionTexts).toEqual(['Bug', '💰Sales', 'VIP']);
    expect(wrapper.findAll('.option .i-lucide-check')).toHaveLength(3);
    await wrapper.find('button.bg-n-alpha-2').trigger('click');
    expect(env.toggle).toHaveBeenCalled();
  });

  it('collapses extra chips into "+N more" but shows a fourth instead of "+1"', () => {
    let wrapper = mountSelect({ options, modelValue: options.slice(0, 4) });
    expect(chips(wrapper)).toEqual([
      'Option 1',
      'Option 2',
      'Option 3',
      'Option 4',
      '',
    ]);
    wrapper = mountSelect({ options, modelValue: options.slice(0, 6) });
    expect(chips(wrapper)).toEqual([
      'Option 1',
      'Option 2',
      'Option 3',
      'COMBOBOX.MORE',
      '',
    ]);
    expect(wrapper.find('[data-tip]').attributes('data-tip')).toBe(
      'Option 4, Option 5, Option 6'
    );
  });

  it('toggles options on and off', async () => {
    const wrapper = mountSelect({
      options: [{ ...options[0], icon: h('svg') }, options[1]],
    });
    await wrapper.findAllComponents(Item)[0].vm.$emit('click');
    expect(lastValue(wrapper)).toEqual([{ id: 1, name: 'Option 1' }]);
    await wrapper.setProps({ modelValue: lastValue(wrapper) });
    await wrapper.findAllComponents(Item)[1].vm.$emit('click');
    expect(lastValue(wrapper)).toEqual([
      { id: 1, name: 'Option 1' },
      { id: 2, name: 'Option 2' },
    ]);
    await wrapper.setProps({ modelValue: lastValue(wrapper) });
    await wrapper.findAllComponents(Item)[0].vm.$emit('click');
    expect(lastValue(wrapper)).toEqual([{ id: 2, name: 'Option 2' }]);
  });

  it('searches long lists', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      name: i === 3 ? 'Billing' : `Team ${i}`,
    }));
    const wrapper = mountSelect({ options: many });
    const search = wrapper.find('input');
    expect(document.activeElement).not.toBe(null);
    await search.setValue('bill');
    expect(wrapper.findAll('.option').map(o => o.text())).toEqual(['Billing']);
    await search.setValue('   ');
    expect(wrapper.findAll('.option')).toHaveLength(10);
    await search.setValue('zzz');
    expect(wrapper.find('.option').text()).toBe(
      'COMBOBOX.EMPTY_SEARCH_RESULTS'
    );
    await wrapper.find('.placeholder').trigger('click');
    expect(search.element.value).toBe('');
    expect(mountSelect({ options }).find('input').exists()).toBe(false);
  });
});
