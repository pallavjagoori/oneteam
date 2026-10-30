import getters from '../../conversations/getters';
import { sortComparator } from '../../conversations/helpers';

/*
 * OneTeam coverage for the conversations Vuex getters that Chatwoot's own
 * getter spec leaves out: the per-tab chat lists (mine, all), the selected
 * chat helpers, translation edge cases and the conversation sort options.
 */
const userWith = account => ({ id: 1, accounts: [{ id: 1, ...account }] });

const chat = (id, extra = {}) => ({
  id,
  status: 'open',
  inbox_id: 1,
  labels: [],
  meta: {},
  messages: [],
  ...extra,
});

describe('conversation getters (OneTeam)', () => {
  describe('chat lists per tab', () => {
    const allConversations = [
      chat(1, { meta: { assignee: { id: 1 } } }),
      chat(2, { meta: { assignee: { id: 2 } } }),
      chat(3),
      chat(4, { status: 'resolved', meta: { assignee: { id: 1 } } }),
    ];
    const filters = { status: 'open' };

    it('lists open chats assigned to the current user', () => {
      const mine = getters.getMineChats(
        { allConversations },
        {},
        {},
        { getCurrentUser: { id: 1 } }
      )(filters);
      expect(mine.map(c => c.id)).toEqual([1]);
      expect(
        getters.getMineChats({ allConversations }, {}, {}, {})(filters)
      ).toEqual([]);
    });

    it('lists every chat an agent or administrator may see', () => {
      const all = getters.getAllStatusChats(
        { allConversations },
        {},
        {},
        {
          getCurrentUser: userWith({ role: 'agent' }),
          getCurrentAccountId: 1,
        }
      )(filters);
      expect(all.map(c => c.id)).toEqual([1, 2, 3]);
    });

    it('limits a custom role to the chats its permissions allow', () => {
      const rootGetters = permissions => ({
        getCurrentUser: userWith({ custom_role_id: 5, permissions }),
        getCurrentAccountId: 1,
      });
      const visible = permissions =>
        getters
          .getAllStatusChats(
            { allConversations },
            {},
            {},
            rootGetters(permissions)
          )(filters)
          .map(c => c.id);

      expect(visible(['conversation_unassigned_manage'])).toEqual([1, 3]);
      expect(visible(['conversation_participating_manage'])).toEqual([1]);
      expect(visible([])).toEqual([]);
    });
  });

  describe('selected chat', () => {
    it('returns the selected chat, or an empty object', () => {
      const state = { selectedChatId: 2, allConversations: [chat(2)] };
      expect(getters.getSelectedChat(state).id).toBe(2);
      expect(getters.getSelectedChat({ ...state, selectedChatId: 9 })).toEqual(
        {}
      );
    });

    it('returns no attachments for a chat without any loaded', () => {
      expect(
        getters.getSelectedChatAttachments({
          selectedChatId: 1,
          attachments: {},
        })
      ).toEqual([]);
    });

    it('reports whether all messages are loaded', () => {
      const state = allMessagesLoaded => ({
        selectedChatId: 1,
        allConversations: [chat(1, { allMessagesLoaded })],
      });
      expect(getters.getAllMessagesLoaded(state(true))).toBe(true);
      expect(getters.getAllMessagesLoaded(state(undefined))).toBe(false);
      expect(
        getters.getAllMessagesLoaded({
          selectedChatId: 9,
          allConversations: [],
        })
      ).toBe(false);
    });

    it('counts incoming public messages the agent has not seen', () => {
      const state = {
        selectedChatId: 1,
        allConversations: [
          chat(1, {
            agent_last_seen_at: 100,
            messages: [
              { created_at: 50, message_type: 0 },
              { created_at: 150, message_type: 0 },
              { created_at: 160, message_type: 0, private: true },
              { created_at: 170, message_type: 1 },
            ],
          }),
        ],
      };
      expect(getters.getUnreadCount(state)).toBe(1);
      expect(
        getters.getUnreadCount({ selectedChatId: 9, allConversations: [] })
      ).toEqual([]);
    });
  });

  it('exposes the simple list state', () => {
    const state = {
      listLoadingStatus: true,
      chatStatusFilter: 'open',
      chatSortFilter: 'latest',
      currentInbox: 3,
      allConversations: [chat(7)],
      conversationParticipants: ['p'],
      conversationLastSeen: 10,
      appliedFilters: [
        { attribute_key: 'status', filter_operator: 'equal_to' },
      ],
    };
    expect(getters.getChatListLoadingStatus(state)).toBe(true);
    expect(getters.getChatStatusFilter(state)).toBe('open');
    expect(getters.getChatSortFilter(state)).toBe('latest');
    expect(getters.getSelectedInbox(state)).toBe(3);
    expect(getters.getConversationById(state)('7').id).toBe(7);
    expect(getters.getConversationParticipants(state)).toEqual(['p']);
    expect(getters.getConversationLastSeen(state)).toBe(10);
    expect(getters.getAppliedConversationFiltersV2(state)).toEqual([
      { attributeKey: 'status', filterOperator: 'equal_to' },
    ]);
  });

  describe('translation', () => {
    const rootGetters = (account, uiLocale) => ({
      getUISettings: uiLocale ? { locale: uiLocale } : undefined,
      'accounts/getAccount': () => account,
      getCurrentAccountId: 1,
      'accounts/isFeatureEnabledonAccount': () => true,
      'integrations/getIntegration': () => ({ enabled: true }),
    });
    const selected = language => ({
      getSelectedChat: {
        additional_attributes: { conversation_language: language },
      },
    });

    it('uses Google Translate when the account picked it and it is connected', () => {
      const account = {
        locale: 'fr',
        settings: {
          auto_translate: true,
          translation_provider: 'google_translate',
        },
      };
      expect(
        getters.getAutoTranslate({}, selected('de'), {}, rootGetters(account))
      ).toMatchObject({
        enabled: true,
        provider: 'google_translate',
        locale: 'fr',
      });
    });

    it('falls back to English for an unknown account, and shows unknown codes as-is', () => {
      expect(
        getters.getAutoTranslate({}, selected('xx'), {}, rootGetters(undefined))
      ).toMatchObject({
        enabled: false,
        locale: 'en',
        agentLanguage: 'English',
      });
      expect(
        getters.getAutoTranslate(
          {},
          selected('xx'),
          {},
          rootGetters({ settings: { auto_translate: true } })
        ).language
      ).toBe('xx');
    });

    it('handles a chat without messages and a message without attributes', () => {
      const state = (selectedChat, id) =>
        getters.getMessageTranslationState(
          { autoTranslating: {} },
          {
            getAutoTranslate: {
              enabled: true,
              locale: 'en',
              language: '',
              sameLanguage: false,
            },
            getSelectedChat: selectedChat,
          }
        )(id);
      expect(state({}, 1)).toMatchObject({ pending: false, failed: false });
      expect(
        state({ messages: [{ id: 1, message_type: 2 }] }, 1)
      ).toMatchObject({ pending: false, originalLanguage: 'English' });
    });
  });

  describe('sort options', () => {
    const sort = (items, key) =>
      [...items].sort((a, b) => sortComparator(a, b, key)).map(c => c.id);

    it('sorts by priority both ways, with ties by latest activity', () => {
      const items = [
        { id: 1, priority: 'low', last_activity_at: 1 },
        { id: 2, priority: 'urgent', last_activity_at: 1 },
        { id: 3, priority: null, last_activity_at: 5 },
        { id: 4, priority: null, last_activity_at: 9 },
      ];
      expect(sort(items, 'priority_desc')).toEqual([2, 1, 4, 3]);
      expect(sort(items, 'priority_asc')).toEqual([1, 2, 4, 3]);
    });

    it('sorts by priority, then oldest first', () => {
      const items = [
        { id: 1, priority: null, created_at: 1 },
        { id: 2, priority: 'high', created_at: 5 },
        { id: 3, priority: 'high', created_at: 2 },
      ];
      expect(sort(items, 'priority_desc_created_at_asc')).toEqual([3, 2, 1]);
    });

    it('sorts by unread count, then latest activity', () => {
      const items = [
        { id: 1, unread_count: 0, last_activity_at: 3 },
        { id: 2, unread_count: 4 },
        { id: 3, last_activity_at: 7 },
        { id: 4 },
      ];
      expect(sort(items, 'unread')).toEqual([2, 3, 1, 4]);
    });
  });
});
