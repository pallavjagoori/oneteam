/**
 * OneTeam behaviour spec for the sidebar section sort menu.
 *
 * Positioning and click-outside are faked. Covers grouping the allowed
 * sort options with the active one ticked, opening on click or hover,
 * the delayed close when the pointer leaves (cancelled when it comes
 * back), click outside, and choosing a sort.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import SortMenu from '../SidebarSortMenu.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted: (_, binding) => {
      env.outside = binding.value;
    },
  },
}));
vi.mock('dashboard/composables/useDropdownPosition', () => ({
  useDropdownPosition: () => ({
    fixedPosition: ref({ class: 'pos', style: {} }),
    updatePosition: env.updatePosition,
  }),
}));

const Dropdown = {
  name: 'DropdownMenu',
  props: ['menuSections'],
  emits: ['action'],
  template: `<div class="menu">
    <template v-for="section in menuSections" :key="section.title">
      <div v-for="item in section.items" :key="item.value" class="item">
        <slot name="trailing-icon" :item="item" />
      </div>
    </template>
  </div>`,
};

const options = [
  'created_at_desc',
  'created_at_asc',
  'alphabetical_asc',
  'alphabetical_desc',
  'unread_count_desc',
  'unread_count_asc',
];

const mountMenu = props =>
  mount(SortMenu, {
    props: { options, activeSort: 'alphabetical_asc', ...props },
    global: {
      stubs: {
        Button: {
          name: 'Button',
          emits: ['click'],
          template:
            '<button class="trigger" @click="$emit(`click`, $event)" />',
        },
        DropdownMenu: Dropdown,
        TeleportWithDirection: { template: '<div><slot /></div>' },
      },
    },
  });

const menu = wrapper => wrapper.findComponent(Dropdown);

describe('SidebarSortMenu behaviour', () => {
  beforeEach(() => {
    env.updatePosition = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups the allowed options and ticks the active one', async () => {
    const wrapper = mountMenu();
    await wrapper.find('.trigger').trigger('click');
    await flushPromises();
    expect(env.updatePosition).toHaveBeenCalled();
    expect(wrapper.emitted('toggle')).toEqual([[true]]);
    expect(
      menu(wrapper)
        .props('menuSections')
        .map(s => [s.title, s.items.map(i => i.label)])
    ).toEqual([
      [
        'SIDEBAR.SORT_GROUPS.CREATED',
        [
          'SIDEBAR.SORT_OPTIONS.CREATED_DESC',
          'SIDEBAR.SORT_OPTIONS.CREATED_ASC',
        ],
      ],
      [
        'SIDEBAR.SORT_GROUPS.ALPHABETICAL',
        [
          'SIDEBAR.SORT_OPTIONS.ALPHABETICAL_ASC',
          'SIDEBAR.SORT_OPTIONS.ALPHABETICAL_DESC',
        ],
      ],
      [
        'SIDEBAR.SORT_GROUPS.UNREAD_COUNT',
        [
          'SIDEBAR.SORT_OPTIONS.UNREAD_COUNT_DESC',
          'SIDEBAR.SORT_OPTIONS.UNREAD_COUNT_ASC',
        ],
      ],
    ]);
    expect(wrapper.findAll('.i-lucide-check')).toHaveLength(1);

    const limited = mountMenu({ options: ['created_at_desc'] });
    await limited.find('.trigger').trigger('click');
    expect(menu(limited).props('menuSections')).toHaveLength(1);
  });

  it('sorts and closes', async () => {
    const wrapper = mountMenu();
    await wrapper.find('.trigger').trigger('click');
    await menu(wrapper).vm.$emit('action', { value: 'unread_count_asc' });
    expect(wrapper.emitted('sort')).toEqual([['unread_count_asc']]);
    expect(wrapper.emitted('toggle').at(-1)).toEqual([false]);
    expect(menu(wrapper).exists()).toBe(false);
  });

  it('opens on hover and closes shortly after the pointer leaves', async () => {
    vi.useFakeTimers();
    const wrapper = mountMenu();
    await wrapper.trigger('mouseenter');
    expect(menu(wrapper).exists()).toBe(true);
    await wrapper.trigger('mouseleave');
    await menu(wrapper).trigger('mouseenter');
    vi.advanceTimersByTime(200);
    await flushPromises();
    expect(menu(wrapper).exists()).toBe(true);
    await menu(wrapper).trigger('mouseleave');
    await wrapper.trigger('mouseleave');
    vi.advanceTimersByTime(150);
    await flushPromises();
    expect(menu(wrapper).exists()).toBe(false);
    wrapper.unmount();
  });

  it('ignores hover when hover opening is off', async () => {
    vi.useFakeTimers();
    const wrapper = mountMenu({ openOnHover: false });
    await wrapper.trigger('mouseenter');
    expect(menu(wrapper).exists()).toBe(false);
    await wrapper.find('.trigger').trigger('click');
    await wrapper.trigger('mouseleave');
    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(menu(wrapper).exists()).toBe(true);
  });

  it('closes on outside clicks but not on the trigger', async () => {
    const wrapper = mountMenu();
    await wrapper.find('.trigger').trigger('click');
    env.outside({ target: wrapper.find('.trigger').element });
    await flushPromises();
    expect(menu(wrapper).exists()).toBe(true);
    env.outside({ target: document.body });
    await flushPromises();
    expect(menu(wrapper).exists()).toBe(false);
  });
});
