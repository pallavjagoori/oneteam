/**
 * OneTeam behaviour spec for the "add" dropdown used by assignment
 * policies to pick agents, teams or inboxes.
 *
 * Covers opening and closing the popover (button and outside click),
 * searching items by name, rendering icon, colour and avatar items with
 * their name/title and email/phone, adding an item, and placing the
 * popover above or right-aligned when there is no room.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import AddDataDropdown from '../AddDataDropdown.vue';

const windowSize = { width: ref(1000), height: ref(800) };
const button = {
  top: ref(100),
  left: ref(100),
  width: ref(50),
  height: ref(30),
};
const dropdown = { width: ref(300), height: ref(200) };
let boundingCalls = 0;
let outside;

vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
      return [
        state,
        value => {
          state.value = typeof value === 'boolean' ? value : !state.value;
        },
      ];
    },
    useWindowSize: () => windowSize,
    useElementBounding: () => {
      boundingCalls += 1;
      return boundingCalls % 2 === 1 ? button : dropdown;
    },
  };
});
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (el, binding) => {
      outside = binding.value;
    },
  },
}));

const Button = {
  name: 'Button',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};
const Input = {
  name: 'Input',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<div class="search"><slot name="prefix" /></div>',
};
const Icon = {
  name: 'Icon',
  props: ['icon'],
  template: '<i class="icon" :data-icon="icon" />',
};
const Avatar = {
  name: 'Avatar',
  props: ['name', 'src'],
  template: '<i class="avatar" />',
};

const items = [
  { id: 1, name: 'Alice', email: 'alice@x.io', avatarUrl: 'a.png' },
  { id: 2, title: 'Sales', color: '#f00' },
  { id: 3, name: 'Website', icon: 'i-lucide-globe', phoneNumber: '+1' },
];

const mountDropdown = () =>
  mount(AddDataDropdown, {
    props: { label: 'Add', searchPlaceholder: 'Find', items },
    global: { stubs: { Button, Input, Icon, Avatar } },
  });

const rows = wrapper => wrapper.findAll('.cursor-pointer');
const popover = wrapper => wrapper.find('.z-50');

describe('AddDataDropdown behaviour', () => {
  beforeEach(() => {
    windowSize.width.value = 1000;
    windowSize.height.value = 800;
    button.top.value = 100;
    button.left.value = 100;
  });

  it('opens, lists items and adds one', async () => {
    const wrapper = mountDropdown();
    expect(popover(wrapper).exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(Input).props('placeholder')).toBe('Find');
    expect(popover(wrapper).classes()).toEqual(
      expect.arrayContaining(['top-full', 'left-0'])
    );

    const [alice, sales, site] = rows(wrapper);
    expect(alice.findComponent(Avatar).props('src')).toBe('a.png');
    expect(alice.classes()).toContain('items-start');
    expect(alice.text()).toContain('alice@x.io');
    expect(sales.find('span').attributes('style')).toContain(
      'background-color'
    );
    expect(sales.classes()).toContain('items-center');
    expect(sales.text()).toBe('Sales');
    expect(site.find('[data-icon="i-lucide-globe"]').exists()).toBe(true);
    expect(site.text()).toContain('+1');

    await sales.trigger('click');
    expect(wrapper.emitted('add')[0][0]).toEqual(items[1]);
    expect(popover(wrapper).exists()).toBe(false);
  });

  it('searches items by name', async () => {
    const wrapper = mountDropdown();
    await wrapper.find('button').trigger('click');
    await wrapper.findComponent(Input).vm.$emit('update:modelValue', 'ALI');
    expect(rows(wrapper).map(r => r.text())).toEqual([
      expect.stringContaining('Alice'),
    ]);
  });

  it('closes with the button or an outside click', async () => {
    const wrapper = mountDropdown();
    outside();
    await wrapper.find('button').trigger('click');
    await wrapper.find('button').trigger('click');
    expect(popover(wrapper).exists()).toBe(false);
    await wrapper.find('button').trigger('click');
    outside();
    await wrapper.vm.$nextTick();
    expect(popover(wrapper).exists()).toBe(false);
  });

  it('flips above and right-aligns when space runs out', async () => {
    button.top.value = 700;
    button.left.value = 900;
    const wrapper = mountDropdown();
    await wrapper.find('button').trigger('click');
    expect(popover(wrapper).classes()).toEqual(
      expect.arrayContaining(['bottom-full', 'right-0'])
    );
  });
});
