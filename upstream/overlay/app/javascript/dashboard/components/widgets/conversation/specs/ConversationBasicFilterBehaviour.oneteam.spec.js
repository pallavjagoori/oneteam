/**
 * OneTeam behaviour spec for the conversation list's status and sort
 * menu.
 *
 * Covers opening and closing the menu (button and outside click), its
 * side on expanded and compact layouts, hiding the status filter, the
 * current status and sort labels, and changing either: telling the
 * list, updating the store and saving both choices (falling back to
 * open and last activity first) to the user's settings.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import ConversationBasicFilter from '../ConversationBasicFilter.vue';

const dispatch = vi.fn();
const updateUISettings = vi.fn();
const status = ref('resolved');
const sort = ref('unread');
let outside;

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ updateUISettings }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: name => (name === 'getChatStatusFilter' ? status : sort),
}));
vi.mock('@vueuse/core', () => ({
  useToggle: () => {
    const state = ref(false);
    return [
      state,
      value => {
        state.value = typeof value === 'boolean' ? value : !state.value;
      },
    ];
  },
}));
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    mounted(_, binding) {
      outside = binding.value;
    },
  },
}));

const SelectMenu = {
  name: 'SelectMenu',
  props: ['modelValue', 'options', 'label', 'subMenuPosition'],
  emits: ['update:modelValue'],
  template: '<div class="select" />',
};

const mountFilter = (props = {}) =>
  mount(ConversationBasicFilter, {
    props: { isOnExpandedLayout: false, ...props },
    global: {
      stubs: {
        SelectMenu,
        NextButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
      directives: { tooltip: {} },
    },
  });

const menus = wrapper => wrapper.findAllComponents(SelectMenu);
const open = async wrapper => {
  await wrapper.find('button').trigger('click');
  return wrapper;
};

describe('ConversationBasicFilter behaviour', () => {
  beforeEach(() => {
    status.value = 'resolved';
    sort.value = 'unread';
    vi.clearAllMocks();
  });

  it('opens and closes the menu', async () => {
    const wrapper = mountFilter();
    expect(menus(wrapper)).toHaveLength(0);
    await open(wrapper);
    expect(menus(wrapper)).toHaveLength(2);
    expect(wrapper.find('.absolute').classes()).toContain('ltr:left-0');
    await wrapper.find('button').trigger('click');
    expect(menus(wrapper)).toHaveLength(0);

    await open(wrapper);
    outside();
    await wrapper.vm.$nextTick();
    expect(menus(wrapper)).toHaveLength(0);
  });

  it('shows the current status and sort on either layout', async () => {
    const compact = await open(mountFilter());
    const [statusMenu, sortMenu] = menus(compact);
    expect(statusMenu.props()).toEqual(
      expect.objectContaining({
        modelValue: 'resolved',
        label: 'CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.resolved.TEXT',
        subMenuPosition: 'right',
      })
    );
    expect(statusMenu.props('options').map(o => o.value)).toEqual([
      'open',
      'resolved',
      'pending',
      'snoozed',
      'all',
    ]);
    expect(sortMenu.props('label')).toBe(
      'CHAT_LIST.SORT_ORDER_ITEMS.unread.TEXT'
    );
    expect(sortMenu.props('options')).toHaveLength(10);
    expect(compact.find('.mt-4').exists()).toBe(true);

    const expanded = await open(mountFilter({ isOnExpandedLayout: true }));
    expect(expanded.find('.absolute').classes()).toContain('ltr:right-0');
    expect(menus(expanded)[0].props('subMenuPosition')).toBe('left');

    status.value = 'unknown';
    sort.value = null;
    const unknown = await open(mountFilter());
    expect(menus(unknown).map(m => m.props('label'))).toEqual(['', '']);
  });

  it('hides the status filter', async () => {
    const wrapper = await open(mountFilter({ showStatusFilter: false }));
    expect(menus(wrapper)).toHaveLength(1);
    expect(wrapper.find('.mt-4').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('CHAT_LIST.CHAT_SORT.STATUS');
  });

  it('changes and saves the status and sort', async () => {
    const wrapper = await open(mountFilter());
    await menus(wrapper)[0].vm.$emit('update:modelValue', 'pending');
    await menus(wrapper)[1].vm.$emit('update:modelValue', 'priority_asc');
    expect(wrapper.emitted('changeFilter')).toEqual([
      ['pending', 'status'],
      ['priority_asc', 'sort'],
    ]);
    expect(dispatch.mock.calls).toEqual([
      ['setChatStatusFilter', 'pending'],
      ['setChatSortFilter', 'priority_asc'],
    ]);
    expect(updateUISettings.mock.calls).toEqual([
      [{ conversations_filter_by: { status: 'pending', order_by: 'unread' } }],
      [
        {
          conversations_filter_by: {
            status: 'resolved',
            order_by: 'priority_asc',
          },
        },
      ],
    ]);
  });

  it('saves defaults when nothing was chosen before', async () => {
    status.value = null;
    sort.value = null;
    const wrapper = await open(mountFilter());
    await menus(wrapper)[0].vm.$emit('update:modelValue', 'all');
    await menus(wrapper)[1].vm.$emit('update:modelValue', 'created_at_asc');
    expect(updateUISettings.mock.calls).toEqual([
      [
        {
          conversations_filter_by: {
            status: 'all',
            order_by: 'last_activity_at_desc',
          },
        },
      ],
      [
        {
          conversations_filter_by: {
            status: 'open',
            order_by: 'created_at_asc',
          },
        },
      ],
    ]);
  });
});
