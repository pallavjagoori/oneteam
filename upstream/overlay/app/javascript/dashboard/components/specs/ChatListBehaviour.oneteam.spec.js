/**
 * OneTeam behaviour specs for the conversation list: loading and paging,
 * assignee tabs, status and sort filters, advanced filters handed over in
 * the URL, folders, the context-menu actions the list provides to its cards
 * (priority, read state, team, status with required attributes, delete) and
 * bulk selection. Children are shallow stubs; the list's own logic is real.
 */
import { flushPromises, shallowMount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import { emitter } from 'shared/helpers/mitt';
import { nextTick, reactive } from 'vue';
import { createStore } from 'vuex';
import ChatList from '../ChatList.vue';

const router = { push: vi.fn(), replace: vi.fn() };
const route = reactive({
  name: 'home',
  params: { accountId: '1' },
  query: {},
});
vi.mock('vue-router', () => ({
  useRouter: () => router,
  useRoute: () => route,
}));
vi.mock('dashboard/composables', async importOriginal => ({
  ...(await importOriginal()),
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const ME = { id: 7, name: 'Agent' };
const chat = (id, extra = {}) => ({
  id,
  inbox_id: 1,
  status: 'open',
  timestamp: 100 + id,
  last_activity_at: 100 + id,
  created_at: 100,
  unread_count: 0,
  meta: { assignee: ME, sender: { id: 2 } },
  custom_attributes: {},
  ...extra,
});
const FOLDER = {
  id: 9,
  name: 'VIP',
  query: {
    payload: [
      {
        attribute_key: 'status',
        filter_operator: 'equal_to',
        values: ['open'],
        query_operator: 'and',
      },
    ],
  },
};

const buildStore = (overrides = {}) => {
  const state = reactive({
    chats: [chat(1), chat(2, { meta: { sender: { id: 3 } } })],
    filtered: [chat(3)],
    loading: false,
    appliedFilters: [],
    contactFilter: null,
    folders: [],
    page: 0,
    endReached: false,
    selected: [],
    uiSettings: {},
    features: [],
    requiredAttributes: [],
    selectedInbox: null,
    stats: { mineCount: 2, unAssignedCount: 1, allCount: 30 },
    ...overrides,
  });
  const store = createStore({
    getters: {
      getAppliedConversationFiltersQuery: () => ({}),
      getCurrentUser: () => ({
        ...ME,
        accounts: [
          { id: 1, role: 'administrator', permissions: ['administrator'] },
        ],
      }),
      getFilteredConversations: () => state.filtered,
      getMineChats: () => () => state.chats.filter(c => c.meta.assignee),
      getAllStatusChats: () => () => state.chats,
      getUnAssignedChats: () => () => state.chats.filter(c => !c.meta.assignee),
      getParticipatingChats: () => () => state.chats,
      getChatListLoadingStatus: () => state.loading,
      getSelectedInbox: () => state.selectedInbox,
      'conversationStats/getStats': () => state.stats,
      getAppliedConversationFiltersV2: () => state.appliedFilters,
      getAppliedContactFilter: () => state.contactFilter,
      'customViews/getConversationCustomViews': () => state.folders,
      'customViews/getActiveFolderContactId': () => 2,
      'agents/getAgents': () => [ME],
      'teams/getTeams': () => [{ id: 4, name: 'Billing' }],
      'teams/getTeam': () => id => (id ? { id, name: 'Billing' } : {}),
      'inboxes/getInboxes': () => [{ id: 1, name: 'Website' }],
      'inboxes/getInbox': () => id => (id ? { id, name: 'Website' } : {}),
      'campaigns/getAllCampaigns': () => [],
      'labels/getLabels': () => [],
      'contacts/getContact': () => id => ({ id, name: 'Ada' }),
      getCurrentAccountId: () => 1,
      getConversationById: () => id =>
        [...state.chats, ...state.filtered].find(c => c.id === id),
      'conversationPage/getCurrentPageFilter': () => () => state.page,
      'conversationPage/getHasEndReached': () => () => state.endReached,
      'attributes/getAttributesByModel': () => () => [],
      'attributes/getConversationAttributes': () => [
        {
          attributeKey: 'order_id',
          attributeDisplayName: 'Order',
          attributeDisplayType: 'text',
        },
      ],
      'bulkActions/getSelectedConversationIds': () => state.selected,
      getUISettings: () => state.uiSettings,
      'accounts/getAccount': () => () => ({
        id: 1,
        settings: {
          conversation_required_attributes: state.requiredAttributes,
        },
      }),
      'accounts/isFeatureEnabledonAccount': () => (_, flag) =>
        state.features.includes(flag),
      'globalConfig/isOnChatwootCloud': () => false,
      'globalConfig/isMetaInboxCreationDisabled': () => false,
      'globalConfig/isMetaMessageSendingDisabled': () => false,
    },
  });
  const failing = new Set();
  store.dispatch = vi.fn(action =>
    failing.has(action) ? Promise.reject(new Error(action)) : Promise.resolve()
  );
  return { store, state, failing };
};

const dialog = { open: vi.fn(), close: vi.fn() };
const attributesModal = { open: vi.fn() };
const mountList = (props = {}, storeOverrides = {}) => {
  const built = buildStore(storeOverrides);
  const wrapper = shallowMount(ChatList, {
    props,
    global: {
      plugins: [built.store],
      mocks: { $t: key => key },
      stubs: {
        Dialog: {
          name: 'Dialog',
          template: '<div />',
          methods: { open: () => dialog.open(), close: () => dialog.close() },
        },
        ConversationResolveAttributesModal: {
          name: 'ConversationResolveAttributesModal',
          template: '<div />',
          methods: { open: (...args) => attributesModal.open(...args) },
        },
        TeleportWithDirection: { template: '<div><slot /></div>' },
      },
    },
  });
  const provided = wrapper.vm.$.provides;
  return { wrapper, provided, ...built };
};

const actions = store => store.dispatch.mock.calls.map(([name]) => name);
const payloadOf = (store, name) =>
  store.dispatch.mock.calls.filter(([action]) => action === name).at(-1)?.[1];
const child = (wrapper, name) => wrapper.findComponent({ name });

beforeEach(() => {
  route.query = {};
  route.name = 'home';
  dialog.open = vi.fn();
  dialog.close = vi.fn();
  attributesModal.open = vi.fn();
});

describe('ChatList behaviour', () => {
  describe('loading', () => {
    it('sets the list filters and fetches conversations on mount', async () => {
      const { wrapper, store } = mountList({
        conversationInbox: 1,
        label: 'vip',
      });
      await flushPromises();
      expect(actions(store)).toEqual(
        expect.arrayContaining([
          'setChatListFilters',
          'setChatStatusFilter',
          'setChatSortFilter',
          'conversationPage/reset',
          'emptyAllConversations',
          'clearConversationFilters',
          'fetchAllConversations',
        ])
      );
      expect(payloadOf(store, 'updateChatListFilters')).toMatchObject({
        inboxId: 1,
        labels: ['vip'],
        assigneeType: 'me',
        status: 'open',
      });
      expect(wrapper.emitted('conversationLoad')).toHaveLength(1);
    });

    it('starts from the status and sort saved in the UI settings', () => {
      const { store } = mountList(
        {},
        {
          uiSettings: {
            conversations_filter_by: {
              status: 'resolved',
              order_by: 'priority_desc',
            },
          },
        }
      );
      expect(payloadOf(store, 'setChatStatusFilter')).toBe('resolved');
      expect(payloadOf(store, 'setChatSortFilter')).toBe('priority_desc');

      const unknown = mountList(
        {},
        { uiSettings: { conversations_filter_by: { order_by: 'bogus' } } }
      );
      expect(payloadOf(unknown.store, 'setChatSortFilter')).toBe(
        'last_activity_at_desc'
      );
    });

    it('applies filters handed over in the URL', async () => {
      const filters = [
        {
          attribute_key: 'status',
          filter_operator: 'equal_to',
          values: ['open'],
          query_operator: 'and',
        },
      ];
      route.query = { filters: JSON.stringify(filters), from: 'report' };
      const { store, wrapper } = mountList();
      await flushPromises();
      expect(router.replace).toHaveBeenCalledWith({
        query: { from: 'report' },
      });
      expect(payloadOf(store, 'setConversationFilters')).toEqual(filters);
      expect(payloadOf(store, 'applyConversationFilters')).toEqual({ filters });
      expect(actions(store)).not.toContain('fetchAllConversations');
      expect(wrapper.emitted('conversationLoad')).toHaveLength(1);
    });

    it('ignores invalid URL filters and loads the normal list', () => {
      route.query = { filters: 'not json' };
      const { store } = mountList();
      expect(actions(store)).toContain('fetchAllConversations');
    });

    it('shows the empty message when nothing is loading', () => {
      const empty = mountList({}, { chats: [] });
      expect(empty.wrapper.text()).toContain('CHAT_LIST.LIST.404');
      const loading = mountList({}, { chats: [], loading: true });
      expect(loading.wrapper.text()).not.toContain('CHAT_LIST.LIST.404');
    });

    it('refreshes stats on request unless filters are applied', () => {
      const { store, state } = mountList();
      emitter.emit('fetch_conversation_stats');
      expect(actions(store)).toContain('conversationStats/get');
      store.dispatch.mockClear();
      state.appliedFilters = [{ attributeKey: 'status' }];
      emitter.emit('fetch_conversation_stats');
      expect(actions(store)).not.toContain('conversationStats/get');
    });
  });

  describe('page title', () => {
    it.each([
      [{ conversationInbox: 1 }, { selectedInbox: 1 }, 'Website'],
      [{ teamId: 4 }, {}, 'Billing'],
      [{ label: 'vip' }, {}, '#vip'],
      [{ conversationType: 'mention' }, {}, 'CHAT_LIST.MENTION_HEADING'],
      [
        { conversationType: 'participating' },
        {},
        'CONVERSATION_PARTICIPANTS.SIDEBAR_MENU_TITLE',
      ],
      [{ conversationType: 'unattended' }, {}, 'CHAT_LIST.UNATTENDED_HEADING'],
      [{ foldersId: 9 }, { folders: [FOLDER] }, 'VIP'],
      [
        {},
        { appliedFilters: [{ attributeKey: 'status' }] },
        'CHAT_LIST.TAB_HEADING',
      ],
      [{}, {}, 'CHAT_LIST.TAB_HEADING'],
    ])('names the list for %o', (props, storeOverrides, title) => {
      const { wrapper } = mountList(props, storeOverrides);
      expect(child(wrapper, 'ChatListHeader').props('pageTitle')).toBe(title);
    });
  });

  describe('tabs and filters', () => {
    it('lists mine, unassigned and all conversations by tab', async () => {
      const { wrapper, store, state } = mountList();
      const list = () =>
        child(wrapper, 'ConversationList').props('conversationList');
      expect(list().map(c => c.id)).toEqual([1]);

      const tabs = child(wrapper, 'ChatTypeTabs');
      expect(tabs.props('items').map(item => item.count)).toEqual([2, 1, 30]);
      tabs.vm.$emit('chatTabChange', 'unassigned');
      await nextTick();
      expect(list().map(c => c.id)).toEqual([2]);
      expect(actions(store)).toContain('fetchAllConversations');

      state.page = 1;
      store.dispatch.mockClear();
      tabs.vm.$emit('chatTabChange', 'all');
      await nextTick();
      expect(list().map(c => c.id)).toEqual([1, 2]);
      expect(actions(store)).toEqual([
        'bulkActions/clearSelectedConversationIds',
        'invalidateConversationListRequests',
        'updateChatListFilters',
      ]);
      expect(child(wrapper, 'ConversationList').props('showAssignee')).toBe(
        true
      );

      store.dispatch.mockClear();
      tabs.vm.$emit('chatTabChange', 'all');
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('filters participating conversations by tab', async () => {
      const { wrapper } = mountList({ conversationType: 'participating' });
      const list = () =>
        child(wrapper, 'ConversationList').props('conversationList');
      expect(list().map(c => c.id)).toEqual([1]);
      child(wrapper, 'ChatTypeTabs').vm.$emit('chatTabChange', 'unassigned');
      await nextTick();
      expect(list().map(c => c.id)).toEqual([2]);
      child(wrapper, 'ChatTypeTabs').vm.$emit('chatTabChange', 'all');
      await nextTick();
      expect(list().map(c => c.id)).toEqual([1, 2]);
    });

    it('puts unread conversations first when sorting by unread', async () => {
      const { wrapper } = mountList(
        {},
        {
          chats: [chat(1), chat(2, { unread_count: 3 })],
        }
      );
      child(wrapper, 'ChatListHeader').vm.$emit(
        'basicFilterChange',
        'unread',
        'sort'
      );
      await nextTick();
      expect(
        child(wrapper, 'ConversationList')
          .props('conversationList')
          .map(c => c.id)
      ).toEqual([2, 1]);
    });

    it('refetches on a status change', () => {
      const { wrapper, store } = mountList();
      store.dispatch.mockClear();
      child(wrapper, 'ChatListHeader').vm.$emit(
        'basicFilterChange',
        'resolved',
        'status'
      );
      expect(payloadOf(store, 'updateChatListFilters').status).toBe('resolved');
    });

    it('re-runs applied filters or the folder query on a sort change', () => {
      const applied = [{ attributeKey: 'status', values: ['open'] }];
      const filtered = mountList({}, { appliedFilters: applied });
      filtered.store.dispatch.mockClear();
      child(filtered.wrapper, 'ChatListHeader').vm.$emit(
        'basicFilterChange',
        'created_at_desc',
        'sort'
      );
      expect(
        payloadOf(filtered.store, 'fetchFilteredConversations')
      ).toMatchObject({
        page: 1,
        sortBy: 'created_at_desc',
      });

      const folder = mountList({ foldersId: 9 }, { folders: [FOLDER] });
      folder.store.dispatch.mockClear();
      child(folder.wrapper, 'ChatListHeader').vm.$emit(
        'basicFilterChange',
        'created_at_desc',
        'sort'
      );
      expect(
        payloadOf(folder.store, 'fetchFilteredConversations').queryData
      ).toEqual(FOLDER.query);
    });

    it('alerts when a filtered fetch fails and still reports the load', async () => {
      const { wrapper, store, failing } = mountList(
        {},
        { appliedFilters: [{ attributeKey: 'status' }] }
      );
      failing.add('fetchFilteredConversations');
      child(wrapper, 'ChatListHeader').vm.$emit(
        'basicFilterChange',
        'priority_desc',
        'sort'
      );
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith('CHAT_LIST.FETCH_ERROR');
      expect(store.dispatch).toHaveBeenCalled();
    });
  });

  describe('loading more', () => {
    const loadMore = wrapper =>
      child(wrapper, 'ConversationList').vm.$emit('loadMore');

    it('stops at the end of the list or while loading', () => {
      const ended = mountList({}, { endReached: true });
      ended.store.dispatch.mockClear();
      loadMore(ended.wrapper);
      const busy = mountList({}, { loading: true });
      busy.store.dispatch.mockClear();
      loadMore(busy.wrapper);
      expect(ended.store.dispatch).not.toHaveBeenCalled();
      expect(busy.store.dispatch).not.toHaveBeenCalled();
      expect(
        child(ended.wrapper, 'ConversationList').props('showEndOfListMessage')
      ).toBe(true);
    });

    it('fetches the next page of the list, the folder or the filters', async () => {
      const plain = mountList(
        {},
        { page: 1, stats: { mineCount: 30, unAssignedCount: 0, allCount: 30 } }
      );
      plain.store.dispatch.mockClear();
      loadMore(plain.wrapper);
      expect(payloadOf(plain.store, 'updateChatListFilters').page).toBe(2);

      const folder = mountList({ foldersId: 9 }, { folders: [FOLDER] });
      folder.store.dispatch.mockClear();
      folder.failing.add('fetchFilteredConversations');
      loadMore(folder.wrapper);
      expect(actions(folder.store)).toEqual(['fetchFilteredConversations']);
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith('CHAT_LIST.FETCH_ERROR');

      const filtered = mountList(
        {},
        { appliedFilters: [{ attributeKey: 'status' }] }
      );
      filtered.store.dispatch.mockClear();
      loadMore(filtered.wrapper);
      expect(actions(filtered.store)).toEqual(['fetchFilteredConversations']);
    });

    it('asks for page one while the first page is short', () => {
      const { store } = mountList(
        {},
        { chats: [], page: 3, stats: { mineCount: 5 } }
      );
      expect(payloadOf(store, 'updateChatListFilters').page).toBe(1);
    });
  });

  describe('advanced filters', () => {
    const header = wrapper => child(wrapper, 'ChatListHeader');

    it('opens the modal with the current inbox, team and label as filters', async () => {
      const { wrapper } = mountList({
        conversationInbox: 1,
        teamId: 4,
        label: 'vip',
      });
      header(wrapper).vm.$emit('filtersModal');
      await nextTick();
      const modal = child(wrapper, 'ConversationFilter');
      // The "mine" tab adds no assignee condition.
      expect(modal.props('modelValue').map(f => f.attributeKey)).toEqual([
        'status',
        'inbox_id',
        'team_id',
        'labels',
      ]);

      header(wrapper).vm.$emit('filtersModal');
      await nextTick();
      expect(child(wrapper, 'ConversationFilter').exists()).toBe(false);
    });

    it('opens the modal with the applied filters', async () => {
      const applied = [{ attributeKey: 'priority', values: ['high'] }];
      const { wrapper } = mountList({}, { appliedFilters: applied });
      header(wrapper).vm.$emit('filtersModal');
      await nextTick();
      expect(child(wrapper, 'ConversationFilter').props('modelValue')).toEqual(
        applied
      );
    });

    it('opens the modal with the folder query and saves folder edits', async () => {
      const { wrapper, store } = mountList(
        { foldersId: 9 },
        {
          folders: [
            {
              ...FOLDER,
              query: {
                payload: [
                  ...FOLDER.query.payload,
                  {
                    attribute_key: 'assignee_id',
                    filter_operator: 'is_present',
                    query_operator: null,
                  },
                ],
              },
            },
          ],
        }
      );
      expect(actions(store)).toContain('campaigns/get');
      header(wrapper).vm.$emit('filtersModal');
      await nextTick();
      const modal = child(wrapper, 'ConversationFilter');
      expect(modal.props('isFolderView')).toBe(true);
      expect(modal.props('folderName')).toBe('VIP');
      expect(modal.props('modelValue')).toHaveLength(2);
      expect(modal.props('modelValue')[1].queryOperator).toBe('and');

      modal.vm.$emit(
        'updateFolder',
        [
          {
            attributeKey: 'status',
            filterOperator: 'equal_to',
            values: ['open'],
          },
        ],
        'VIP 2'
      );
      await nextTick();
      expect(payloadOf(store, 'customViews/update')).toMatchObject({
        id: 9,
        name: 'VIP 2',
      });
      expect(child(wrapper, 'ConversationFilter').exists()).toBe(false);
    });

    it('skips folder values when the folder has no query list', async () => {
      const { wrapper } = mountList(
        { foldersId: 9 },
        { folders: [{ id: 9, name: 'Odd', query: {} }] }
      );
      header(wrapper).vm.$emit('filtersModal');
      await nextTick();
      expect(child(wrapper, 'ConversationFilter').props('modelValue')).toEqual(
        expect.any(Array)
      );
    });

    it('applies filters from the modal and closes it', async () => {
      const { wrapper, store, failing } = mountList();
      header(wrapper).vm.$emit('filtersModal');
      await nextTick();
      failing.add('applyConversationFilters');
      child(wrapper, 'ConversationFilter').vm.$emit('applyFilter', [
        { attributeKey: 'status' },
      ]);
      await flushPromises();
      expect(payloadOf(store, 'applyConversationFilters')).toEqual({
        filters: [{ attribute_key: 'status' }],
      });
      expect(useAlert).toHaveBeenCalledWith('CHAT_LIST.FETCH_ERROR');

      header(wrapper).vm.$emit('filtersModal');
      await nextTick();
      child(wrapper, 'ConversationFilter').vm.$emit('update:modelValue', []);
      child(wrapper, 'ConversationFilter').vm.$emit('close');
      await nextTick();
      expect(child(wrapper, 'ConversationFilter').exists()).toBe(false);
    });

    it('clears the selection when filters change elsewhere', async () => {
      const { store, state } = mountList();
      store.dispatch.mockClear();
      state.appliedFilters = [{ attributeKey: 'status' }];
      await nextTick();
      expect(actions(store)).toContain(
        'bulkActions/clearSelectedConversationIds'
      );
    });

    it('opens the latest conversation when leaving a contact history', () => {
      const { wrapper } = mountList({}, { contactFilter: { id: 2 } });
      header(wrapper).vm.$emit('resetFilters');
      expect(router.push).toHaveBeenCalledWith(expect.stringContaining('/3'));

      router.push.mockClear();
      const expanded = mountList(
        { isOnExpandedLayout: true },
        { contactFilter: { id: 2 } }
      );
      header(expanded.wrapper).vm.$emit('resetFilters');
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('folders', () => {
    it('opens and closes the save and delete folder modals', async () => {
      const { wrapper } = mountList({ foldersId: 9 }, { folders: [FOLDER] });
      child(wrapper, 'ChatListHeader').vm.$emit('addFolders');
      child(wrapper, 'ChatListHeader').vm.$emit('deleteFolders');
      await nextTick();
      const save = child(wrapper, 'SaveCustomView');
      const remove = child(wrapper, 'DeleteCustomViews');
      expect(remove.props('activeCustomView')).toEqual(FOLDER);

      save.props('openLastSavedItem')();
      expect(router.push).toHaveBeenCalledWith({
        name: 'folder_conversations',
        params: { id: 9 },
      });

      remove.props('openLastItemAfterDelete')();
      expect(router.push).toHaveBeenLastCalledWith({
        name: 'folder_conversations',
        params: { id: 9 },
      });

      save.vm.$emit('update:modelValue', [{ attributeKey: 'status' }]);
      remove.vm.$emit('update:show', true);

      save.vm.$emit('close');
      remove.vm.$emit('close');
      await nextTick();
      expect(child(wrapper, 'SaveCustomView').exists()).toBe(false);
      expect(child(wrapper, 'DeleteCustomViews').exists()).toBe(false);
    });

    it('goes home after deleting the last folder', async () => {
      const { wrapper, store } = mountList();
      child(wrapper, 'ChatListHeader').vm.$emit('deleteFolders');
      await nextTick();
      store.dispatch.mockClear();
      child(wrapper, 'DeleteCustomViews').props('openLastItemAfterDelete')();
      expect(router.push).toHaveBeenLastCalledWith({ name: 'home' });
      expect(actions(store)).toContain('fetchAllConversations');
    });

    it('tracks the active folder as it changes', async () => {
      const { wrapper, store } = mountList(
        { foldersId: 9 },
        { folders: [FOLDER] }
      );
      store.dispatch.mockClear();
      await wrapper.setProps({ foldersId: 0 });
      expect(
        payloadOf(store, 'customViews/setActiveConversationFolder')
      ).toBeNull();
    });
  });

  describe('refetching on context changes', () => {
    it.each([
      ['conversationInbox', 2],
      ['label', 'billing'],
      ['conversationType', 'mention'],
      ['teamId', 4],
    ])('refetches when %s changes', async (prop, value) => {
      const { wrapper, store } = mountList();
      store.dispatch.mockClear();
      await wrapper.setProps({ [prop]: value });
      expect(actions(store)).toContain('fetchAllConversations');
    });

    it('mirrors the visible chats when the filtered list changes', async () => {
      const { state, wrapper } = mountList(
        {},
        { appliedFilters: [{ attributeKey: 'status' }] }
      );
      state.filtered = [chat(4), chat(5)];
      await nextTick();
      expect(
        child(wrapper, 'ConversationList')
          .props('conversationList')
          .map(c => c.id)
      ).toEqual([4, 5]);
    });
  });

  describe('card actions', () => {
    it('changes priority and confirms', async () => {
      const { provided, store } = mountList();
      await provided.assignPriority('high', 1);
      await flushPromises();
      expect(payloadOf(store, 'setCurrentChatPriority')).toEqual({
        priority: 'high',
        conversationId: 1,
      });
      expect(useTrack).toHaveBeenCalled();
      expect(useAlert).toHaveBeenCalledWith(
        'CONVERSATION.PRIORITY.CHANGE_PRIORITY.SUCCESSFUL'
      );
    });

    it('marks conversations read and unread, ignoring failures', async () => {
      const { provided, store, failing } = mountList();
      await provided.markAsUnread(1);
      expect(router.push).toHaveBeenCalled();
      await provided.markAsRead(1);
      expect(payloadOf(store, 'markMessagesRead')).toEqual({ id: 1 });

      failing.add('markMessagesUnread');
      failing.add('markMessagesRead');
      router.push.mockClear();
      await provided.markAsUnread(1);
      await provided.markAsRead(1);
      expect(router.push).not.toHaveBeenCalled();
    });

    it('assigns a team or reports the failure', async () => {
      const { provided, failing } = mountList();
      await provided.assignTeam({ id: 4, name: 'Billing' }, 1);
      failing.add('assignTeam');
      await provided.assignTeam({ id: 4, name: 'Billing' }, 1);
      expect(useAlert.mock.calls.map(([m]) => m)).toEqual([
        'CONVERSATION.CARD_CONTEXT_MENU.API.TEAM_ASSIGNMENT.SUCCESFUL',
        'CONVERSATION.CARD_CONTEXT_MENU.API.TEAM_ASSIGNMENT.FAILED',
      ]);
    });

    it('snoozes or resolves directly when nothing is required', async () => {
      const { provided, store } = mountList();
      provided.updateConversationStatus(1, 'snoozed', 123);
      await flushPromises();
      expect(payloadOf(store, 'toggleStatus')).toEqual({
        conversationId: 1,
        status: 'snoozed',
        snoozedUntil: 123,
      });
      provided.updateConversationStatus(1, 'resolved');
      await flushPromises();
      expect(payloadOf(store, 'toggleStatus').status).toBe('resolved');
      expect(useAlert).toHaveBeenCalledWith('CONVERSATION.CHANGE_STATUS');
    });

    it('asks for missing required attributes before resolving', async () => {
      const { provided, store, wrapper } = mountList(
        {},
        {
          features: ['conversation_required_attributes'],
          requiredAttributes: ['order_id'],
          chats: [chat(1, { custom_attributes: { note: 'x' } }), chat(2)],
        }
      );
      store.dispatch.mockClear();
      provided.updateConversationStatus(1, 'resolved', null);
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(attributesModal.open).toHaveBeenCalledWith(
        [expect.objectContaining({ value: 'order_id' })],
        { note: 'x' },
        { id: 1, snoozedUntil: null }
      );

      child(wrapper, 'ConversationResolveAttributesModal').vm.$emit('submit', {
        attributes: { order_id: 'A1' },
        context: { id: 1, snoozedUntil: null },
      });
      expect(payloadOf(store, 'toggleStatus')).toEqual({
        conversationId: 1,
        status: 'resolved',
        snoozedUntil: null,
        customAttributes: { note: 'x', order_id: 'A1' },
      });

      store.dispatch.mockClear();
      child(wrapper, 'ConversationResolveAttributesModal').vm.$emit('submit', {
        attributes: {},
      });
      child(wrapper, 'ConversationResolveAttributesModal').vm.$emit('submit', {
        attributes: { order_id: 'B' },
        context: { id: 99 },
      });
      expect(actions(store)).toEqual(['toggleStatus']);

      provided.updateConversationStatus(99, 'resolved');
      expect(attributesModal.open).toHaveBeenLastCalledWith(
        expect.any(Array),
        {},
        { id: 99, snoozedUntil: undefined }
      );
    });

    it('deletes a conversation after confirming', async () => {
      const { provided, wrapper, store, failing } = mountList();
      provided.deleteConversation(2);
      expect(dialog.open).toHaveBeenCalled();
      const confirm = child(wrapper, 'Dialog');
      await nextTick();
      expect(confirm.exists()).toBe(true);
      confirm.vm.$emit('confirm');
      await flushPromises();
      expect(payloadOf(store, 'deleteConversation')).toBe(2);
      expect(dialog.close).toHaveBeenCalled();
      expect(useAlert).toHaveBeenCalledWith(
        'CONVERSATION.SUCCESS_DELETE_CONVERSATION'
      );

      failing.add('deleteConversation');
      provided.deleteConversation(1);
      confirm.vm.$emit('confirm');
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith(
        'CONVERSATION.FAIL_DELETE_CONVERSATION'
      );
      confirm.vm.$emit('close');
    });
  });

  describe('bulk selection', () => {
    it('reports which bulk actions fit the selection', () => {
      const none = mountList();
      expect(
        child(none.wrapper, 'ConversationBulkActions').props('showOpenAction')
      ).toBe(false);

      const { wrapper } = mountList({}, { selected: [1, 2] });
      const bulk = child(wrapper, 'ConversationBulkActions');
      expect(bulk.props('showOpenAction')).toBe(true);
      expect(bulk.props('showResolvedAction')).toBe(false);
    });

    it('selects every conversation in the list', () => {
      const { wrapper, store, provided } = mountList();
      child(wrapper, 'ConversationBulkActions').vm.$emit(
        'selectAllConversations',
        true
      );
      expect(actions(store)).toContain(
        'bulkActions/setSelectedConversationIds'
      );
      expect(provided.isConversationSelected(1)).toBe(false);
      provided.selectConversation(1, 1);
      provided.deSelectConversation(1, 1);
      expect(typeof provided.assignAgent).toBe('function');
      expect(typeof provided.assignLabels).toBe('function');
      expect(typeof provided.removeLabels).toBe('function');
    });

    it('knows when every visible conversation is selected', () => {
      const { wrapper } = mountList({}, { selected: [1] });
      expect(
        child(wrapper, 'ConversationBulkActions').props(
          'allConversationsSelected'
        )
      ).toBe(true);
    });
  });
});
