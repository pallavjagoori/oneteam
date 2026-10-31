/**
 * OneTeam behaviour spec for the shared dropdown menu.
 *
 * Covers flat item lists and titled sections (thumbnails, icons, emoji,
 * selected, delete and disabled items, loading and empty sections),
 * local search filtering with "search" and "empty" events, server-side
 * filtering, the loading, searching and empty messages, focusing the
 * search box on mount, custom slots and the footer.
 */
import { mount } from '@vue/test-utils';
import DropdownMenu from '../DropdownMenu.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const Avatar = {
  name: 'Avatar',
  props: ['name', 'src', 'size', 'roundedFull'],
  template: '<i class="avatar" />',
};
const Icon = { name: 'Icon', props: ['icon'], template: '<i class="icon" />' };
const EmojiIcon = {
  name: 'EmojiIcon',
  props: ['value', 'color'],
  template: '<i class="emoji" />',
};
const Spinner = {
  name: 'Spinner',
  props: ['size'],
  template: '<i class="spin" />',
};

const items = [
  {
    label: 'Alice',
    value: 1,
    action: 'assign',
    thumbnail: { name: 'Alice', src: 'a.png' },
    isSelected: true,
  },
  { label: 'Archive', value: 2, action: 'archive', icon: 'i-lucide-box' },
  {
    label: 'Delete',
    value: 3,
    action: 'delete',
    emoji: '🗑',
    iconColor: 'red',
  },
  { label: 'Locked', value: 4, action: 'lock', disabled: true },
  { value: 5, action: 'blank' },
];

const mountMenu = (props, slots) =>
  mount(DropdownMenu, {
    props,
    slots,
    attachTo: document.body,
    global: { stubs: { Avatar, Icon, EmojiIcon, Spinner } },
  });
const buttons = wrapper => wrapper.findAll('button');
const search = async (wrapper, value) => {
  const input = wrapper.find('input[type="search"]');
  await input.setValue(value);
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('DropdownMenu behaviour', () => {
  it('renders flat items with their decorations', () => {
    const wrapper = mountMenu({
      menuItems: items,
      thumbnailSize: 32,
      roundedThumbnail: false,
      labelClass: 'big',
    });
    const all = buttons(wrapper);
    expect(all).toHaveLength(5);
    expect(all[0].classes()).toContain('bg-n-alpha-1');
    expect(wrapper.findComponent(Avatar).props()).toMatchObject({
      name: 'Alice',
      src: 'a.png',
      size: 32,
      roundedFull: false,
    });
    expect(wrapper.findComponent(Icon).props('icon')).toBe('i-lucide-box');
    expect(wrapper.findComponent(EmojiIcon).props()).toEqual({
      value: '🗑',
      color: 'red',
    });
    expect(all[2].classes()).toContain('text-n-ruby-11');
    expect(all[3].attributes('disabled')).toBeDefined();
    expect(all[0].find('span').classes()).toContain('big');
    expect(all[4].find('span').exists()).toBe(false);
    expect(wrapper.find('input').exists()).toBe(false);
  });

  it('emits the clicked item as an action', async () => {
    const wrapper = mountMenu({ menuItems: items });
    await buttons(wrapper)[1].trigger('click');
    expect(wrapper.emitted('action')[0][0]).toEqual(items[1]);
  });

  it('shows a spinner and the empty message for flat lists', () => {
    const loading = mountMenu({ isLoading: true });
    expect(loading.findComponent(Spinner).exists()).toBe(true);
    expect(loading.text()).toContain('DROPDOWN_MENU.EMPTY_STATE');
    expect(mountMenu({ emptyStateMessage: 'NONE' }).text()).toContain('NONE');
    expect(mountMenu({ isSearching: true }).text()).toContain(
      'DROPDOWN_MENU.SEARCHING'
    );
  });

  it('filters flat items locally, focusing the search box', async () => {
    const wrapper = mountMenu({
      menuItems: items.slice(0, 4),
      showSearch: true,
    });
    const input = wrapper.find('input[type="search"]');
    expect(document.activeElement).toBe(input.element);
    expect(input.attributes('placeholder')).toBe(
      'DROPDOWN_MENU.SEARCH_PLACEHOLDER'
    );
    await search(wrapper, 'AR');
    expect(buttons(wrapper).map(b => b.text())).toEqual(['Archive']);
    expect(wrapper.emitted('search')).toEqual([['AR']]);
    expect(wrapper.emitted('empty')).toBeUndefined();
    await search(wrapper, 'zzz');
    expect(wrapper.emitted('empty')).toHaveLength(1);
    expect(wrapper.text()).toContain('DROPDOWN_MENU.EMPTY_STATE');
  });

  it('leaves filtering to the server when asked', async () => {
    const wrapper = mountMenu({
      menuItems: items.slice(0, 2),
      showSearch: true,
      searchPlaceholder: 'Find',
      disableLocalFiltering: true,
    });
    expect(wrapper.find('input').attributes('placeholder')).toBe('Find');
    await search(wrapper, 'zzz');
    expect(buttons(wrapper)).toHaveLength(2);
  });

  describe('with sections', () => {
    const sections = [
      { title: 'Agents', items: items.slice(0, 2) },
      { items: items.slice(2, 4) },
      { title: 'Teams', isLoading: true },
      { title: 'Bots', items: [], emptyState: 'No bots' },
      { title: 'Labels', items: [] },
    ];

    it('renders titled sections with loading and empty states', () => {
      const wrapper = mountMenu({ menuSections: sections });
      expect(wrapper.text()).toContain('Agents');
      expect(wrapper.text()).toContain('No bots');
      expect(wrapper.findComponent(Spinner).exists()).toBe(true);
      expect(buttons(wrapper)).toHaveLength(4);
      expect(wrapper.findComponent(Avatar).exists()).toBe(true);
      expect(wrapper.findComponent(Icon).exists()).toBe(true);
      expect(wrapper.findComponent(EmojiIcon).exists()).toBe(true);
      expect(wrapper.findAll('.h-px')).toHaveLength(4);
    });

    it('emits actions from section items', async () => {
      const wrapper = mountMenu({ menuSections: sections });
      await buttons(wrapper)[2].trigger('click');
      expect(wrapper.emitted('action')[0][0]).toEqual(items[2]);
    });

    it('filters sections locally and reports empty results', async () => {
      const wrapper = mountMenu({
        menuSections: sections.slice(0, 2),
        showSearch: true,
      });
      await search(wrapper, 'del');
      expect(buttons(wrapper).map(b => b.text())).toEqual(['Delete']);
      expect(wrapper.text()).not.toContain('Agents');
      await search(wrapper, 'zzz');
      expect(wrapper.emitted('empty')).toHaveLength(1);
      expect(wrapper.text()).toContain('DROPDOWN_MENU.EMPTY_STATE');
    });

    it('keeps every section when filtering is server side', async () => {
      const wrapper = mountMenu({
        menuSections: sections.slice(0, 2),
        showSearch: true,
        disableLocalFiltering: true,
      });
      await search(wrapper, 'zzz');
      expect(buttons(wrapper)).toHaveLength(4);
      expect(wrapper.text()).toContain('Agents');
    });

    it('uses custom slots for section items and the footer', () => {
      const wrapper = mountMenu(
        { menuSections: [{ items: [items[1]] }] },
        {
          thumbnail: '<b class="thumb" />',
          icon: '<b class="custom-icon" />',
          label: '<b class="custom-label">{{ params.item.label }}</b>',
          'trailing-icon': '<b class="trail" />',
          footer: '<footer class="foot">More</footer>',
        }
      );
      expect(wrapper.find('.thumb').exists()).toBe(true);
      expect(wrapper.find('.custom-icon').exists()).toBe(true);
      expect(wrapper.find('.custom-label').text()).toBe('Archive');
      expect(wrapper.find('.trail').exists()).toBe(true);
      expect(wrapper.find('.foot').text()).toBe('More');
    });
  });
});
