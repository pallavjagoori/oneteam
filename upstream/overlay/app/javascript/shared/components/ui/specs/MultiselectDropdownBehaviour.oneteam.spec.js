/**
 * OneTeam behaviour spec for the single-pick dropdown with search.
 *
 * Covers the placeholder without a selection, the selected item's name
 * and avatar, agent bots (dash for a missing name, bot icon and badge),
 * emoji and plain icons, hiding the thumbnail, opening and closing the
 * list (toggle, close button, Escape, outside click), and picking an
 * item.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import MultiselectDropdown from '../MultiselectDropdown.vue';

let outside;
vi.mock('@vueuse/components', () => ({
  OnClickOutside: {
    emits: ['trigger'],
    setup(_, { emit }) {
      outside = () => emit('trigger');
    },
    template: '<div><slot /></div>',
  },
}));

vi.mock('@vueuse/core', () => ({
  useToggle: initial => {
    const state = ref(initial);
    return [
      state,
      value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      },
    ];
  },
}));

const Button = {
  name: 'Button',
  props: { icon: String },
  emits: ['click'],
  template:
    '<button :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
};
const Avatar = {
  name: 'Avatar',
  props: ['src', 'status', 'name', 'iconName', 'size'],
  template: '<span class="avatar"><slot name="badge" /></span>',
};
const Items = {
  name: 'MultiselectDropdownItems',
  props: ['options', 'selectedItems', 'hasThumbnail', 'showEmojiIcon'],
  emits: ['select'],
  template: '<ul class="items" />',
};

const mountDropdown = (props = {}) =>
  mount(MultiselectDropdown, {
    props: { options: [{ id: 1, name: 'Ann' }], ...props },
    global: {
      stubs: {
        Button,
        Avatar,
        MultiselectDropdownItems: Items,
        Icon: {
          props: ['icon'],
          template: '<i class="icon" :data-icon="icon" />',
        },
        EmojiIcon: {
          props: ['value'],
          template: '<b class="emoji">{{ value }}</b>',
        },
      },
    },
  });

const toggle = wrapper => wrapper.findAll('button')[0];
const isOpen = wrapper => wrapper.find('.items').exists();

describe('MultiselectDropdown behaviour', () => {
  it('shows the placeholder without a selection', () => {
    const wrapper = mountDropdown();
    expect(wrapper.find('h4').text()).toBe('None');
    expect(wrapper.find('.avatar').exists()).toBe(false);
    expect(mountDropdown({ selectedItem: null }).find('h4').text()).toBe(
      'None'
    );
  });

  it('shows the selected person with an avatar', () => {
    const wrapper = mountDropdown({
      selectedItem: { id: 1, name: 'Ann', avatar_url: 'a.png' },
    });
    expect(wrapper.find('h4').attributes('title')).toBe('Ann');
    const avatar = wrapper.findComponent(Avatar);
    expect(avatar.props('src')).toBe('a.png');
    expect(avatar.props('iconName')).toBeUndefined();
    expect(
      mountDropdown({ selectedItem: { id: 1, name: 'A', thumbnail: 't.png' } })
        .findComponent(Avatar)
        .props('src')
    ).toBe('t.png');
    expect(
      mountDropdown({
        selectedItem: { id: 1, name: 'A' },
        hasThumbnail: false,
      })
        .find('.avatar')
        .exists()
    ).toBe(false);
  });

  it('shows agent bots with a bot icon and badge', () => {
    const bot = mountDropdown({
      selectedItem: { id: 2, assignee_type: 'AgentBot', thumbnail: 'b.png' },
    });
    expect(bot.find('h4').text()).toBe('-');
    expect(bot.findComponent(Avatar).props('iconName')).toBe('i-lucide-bot');
    expect(bot.find('.avatar .icon').exists()).toBe(true);

    const plain = mountDropdown({
      selectedItem: { id: 2, name: 'Bot', assignee_type: 'AgentBot' },
    });
    expect(plain.find('h4').text()).toBe('Bot');
    expect(plain.find('.avatar .icon').exists()).toBe(false);
  });

  it('shows emoji or plain icons for items with an icon', () => {
    const item = { id: 3, name: 'Sales', icon: '🎯' };
    const emoji = mountDropdown({ selectedItem: item, showEmojiIcon: true });
    expect(emoji.find('.emoji').text()).toBe('🎯');
    expect(emoji.find('.avatar').exists()).toBe(false);

    const icon = mountDropdown({ selectedItem: { ...item, icon: 'i-x' } });
    expect(icon.find('.icon[data-icon="i-x"]').exists()).toBe(true);
  });

  it('opens, closes and picks an item', async () => {
    const wrapper = mountDropdown({ selectedItem: { id: 1, name: 'Ann' } });
    expect(isOpen(wrapper)).toBe(false);
    expect(toggle(wrapper).attributes('data-icon')).toBe(
      'i-lucide-chevron-down'
    );

    await toggle(wrapper).trigger('click');
    expect(isOpen(wrapper)).toBe(true);
    expect(toggle(wrapper).attributes('data-icon')).toBe('i-lucide-chevron-up');
    expect(wrapper.findComponent(Items).props('selectedItems')).toEqual([
      { id: 1, name: 'Ann' },
    ]);
    await toggle(wrapper).trigger('click');
    expect(isOpen(wrapper)).toBe(false);

    await toggle(wrapper).trigger('click');
    await wrapper.find('button[data-icon="i-lucide-x"]').trigger('click');
    expect(isOpen(wrapper)).toBe(false);

    await toggle(wrapper).trigger('click');
    await wrapper.find('.relative').trigger('keyup', { key: 'Escape' });
    expect(isOpen(wrapper)).toBe(false);

    await toggle(wrapper).trigger('click');
    outside();
    await wrapper.vm.$nextTick();
    expect(isOpen(wrapper)).toBe(false);

    await toggle(wrapper).trigger('click');
    await wrapper.findComponent(Items).vm.$emit('select', { id: 5 });
    expect(wrapper.emitted('select')).toEqual([[{ id: 5 }]]);
    expect(isOpen(wrapper)).toBe(false);
  });
});
