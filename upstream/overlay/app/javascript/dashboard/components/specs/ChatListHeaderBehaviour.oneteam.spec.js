/**
 * OneTeam behaviour spec for the conversation list header's actions.
 *
 * Complements Chatwoot's ChatListHeader spec. Covers the status label
 * and the filtered count badge (hidden while loading or when zero),
 * clearing filters, saving a filter as a folder, editing and deleting a
 * folder, opening the filters modal, passing basic filter changes on,
 * and switching between the condensed and expanded layouts.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import ChatListHeader from '../ChatListHeader.vue';

const env = vi.hoisted(() => ({ update: vi.fn(), settings: null }));

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: env.settings,
    updateUISettings: env.update,
  }),
}));

const NextButton = {
  name: 'NextButton',
  props: ['icon'],
  emits: ['click'],
  template: '<button :class="icon" @click="$emit(\'click\')" />',
};
const BasicFilter = {
  name: 'ConversationBasicFilter',
  props: { showStatusFilter: Boolean },
  emits: ['changeFilter'],
  template: '<div class="basic" />',
};
const SwitchLayout = {
  name: 'SwitchLayout',
  emits: ['toggle'],
  template: '<button class="switch" @click="$emit(\'toggle\')" />',
};

const mountHeader = props =>
  mount(ChatListHeader, {
    props: {
      pageTitle: 'Conversations',
      hasAppliedFilters: false,
      hasActiveFolders: false,
      activeStatus: 'open',
      isOnExpandedLayout: false,
      conversationStats: { allCount: 1234 },
      isListLoading: false,
      ...props,
    },
    global: {
      stubs: { NextButton, ConversationBasicFilter: BasicFilter, SwitchLayout },
      directives: { tooltip: {} },
    },
  });

const click = (wrapper, icon) =>
  wrapper.find(`button.${icon}`).trigger('click');

describe('ChatListHeader behaviour', () => {
  beforeEach(() => {
    env.settings = ref({});
    vi.clearAllMocks();
  });

  it('shows the status label without filters and passes filter changes on', async () => {
    const wrapper = mountHeader();
    expect(wrapper.text()).toContain(
      'CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.open.TEXT'
    );
    expect(wrapper.findComponent(BasicFilter).props('showStatusFilter')).toBe(
      true
    );
    await wrapper
      .findComponent(BasicFilter)
      .vm.$emit('changeFilter', 'all', 'status');
    expect(wrapper.emitted('basicFilterChange')).toEqual([['all', 'status']]);
    await click(wrapper, 'i-lucide-list-filter');
    expect(wrapper.emitted('filtersModal')).toHaveLength(1);
  });

  it('counts filtered conversations, clears and saves filters', async () => {
    const wrapper = mountHeader({
      hasAppliedFilters: true,
      isOnExpandedLayout: true,
    });
    expect(wrapper.find('span[title="1234"]').text()).toBe('1.2K');
    expect(wrapper.classes()).toContain('border-b');
    expect(wrapper.find('#saveFilterTeleportTarget').classes()).toContain(
      'ltr:right-0'
    );
    await click(wrapper, 'i-lucide-chevron-left');
    await click(wrapper, 'i-lucide-save');
    expect(wrapper.emitted('resetFilters')).toHaveLength(1);
    expect(wrapper.emitted('addFolders')).toHaveLength(1);

    expect(
      mountHeader({ hasAppliedFilters: true, isListLoading: true })
        .find('span[title]')
        .exists()
    ).toBe(false);
    expect(
      mountHeader({ hasAppliedFilters: true, conversationStats: {} })
        .find('span[title]')
        .exists()
    ).toBe(false);
  });

  it('edits and deletes an active folder', async () => {
    const wrapper = mountHeader({ hasActiveFolders: true });
    await click(wrapper, 'i-lucide-pen-line');
    await click(wrapper, 'i-lucide-trash-2');
    expect(wrapper.emitted('filtersModal')).toHaveLength(1);
    expect(wrapper.emitted('deleteFolders')).toHaveLength(1);
    expect(wrapper.find('button.i-lucide-list-filter').exists()).toBe(false);
  });

  it('switches between condensed and expanded layouts', async () => {
    const wrapper = mountHeader();
    await wrapper.find('.switch').trigger('click');
    expect(env.update).toHaveBeenLastCalledWith({
      conversation_display_type: 'expanded',
      previously_used_conversation_display_type: 'expanded',
    });
    env.settings.value = { conversation_display_type: 'expanded' };
    await wrapper.find('.switch').trigger('click');
    expect(env.update).toHaveBeenLastCalledWith({
      conversation_display_type: 'condensed',
      previously_used_conversation_display_type: 'condensed',
    });
  });
});
