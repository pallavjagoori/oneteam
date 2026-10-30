import MessageApi from 'dashboard/api/inbox/message';
import { useAlert } from 'dashboard/composables';
import { mutations } from '../../conversations';
import getters from '../../conversations/getters';
import translateActions from '../../conversations/actions/messageTranslateActions';
import { applyPageFilters, sortComparator } from '../../conversations/helpers';
import { buildConversationList } from '../../conversations/helpers/actionHelpers';
import { createFiltersMatcher } from '../../conversations/helpers/filterHelpers';
import types from '../../../mutation-types';

/*
 * OneTeam coverage for the rest of the conversations module: mutation edge
 * cases (missing chats, list replacement), auto-translation, list building
 * and the filter/sort helpers.
 */
vi.mock('dashboard/api/inbox/message', () => ({
  default: { translateMessage: vi.fn(), autoTranslate: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const chat = (id, extra = {}) => ({ id, meta: {}, messages: [], ...extra });

describe('conversations module (OneTeam)', () => {
  afterEach(() => vi.clearAllMocks());

  describe('mutations', () => {
    it('adds new conversations to the list', () => {
      const state = { allConversations: [chat(1)], selectedChatId: null };
      mutations[types.SET_ALL_CONVERSATION](state, [chat(2)]);
      expect(state.allConversations.map(c => c.id)).toEqual([1, 2]);
    });

    it('replaces the list but keeps the open chat and its messages', () => {
      const open = chat(1, { messages: [{ id: 9 }], dataFetched: true });
      const state = { allConversations: [open], selectedChatId: 1 };
      mutations[types.REPLACE_CONVERSATION_LIST](state, [
        chat(1, { status: 'resolved' }),
        chat(2),
      ]);
      expect(state.allConversations[0]).toMatchObject({
        status: 'resolved',
        messages: [{ id: 9 }],
        dataFetched: true,
      });

      mutations[types.REPLACE_CONVERSATION_LIST](state, [chat(3)]);
      expect(state.allConversations.map(c => c.id)).toEqual([3, 1]);

      const empty = { allConversations: [], selectedChatId: null };
      mutations[types.REPLACE_CONVERSATION_LIST](empty, [chat(4)]);
      expect(empty.allConversations.map(c => c.id)).toEqual([4]);
    });

    it('ignores updates for chats that are not loaded', () => {
      const state = {
        allConversations: [],
        attachments: {},
        conversationFilters: undefined,
      };
      mutations[types.ASSIGN_AGENT](state, { conversationId: 1 });
      mutations[types.UPDATE_CONVERSATION_LAST_ACTIVITY](state, {
        conversationId: 1,
        lastActivityAt: 5,
      });
      mutations[types.UPDATE_CONVERSATION_CUSTOM_ATTRIBUTES](state, {
        conversationId: 1,
        customAttributes: {},
      });
      mutations[types.CHANGE_CONVERSATION_STATUS](state, {
        conversationId: 1,
        status: 'open',
      });
      mutations[types.UPDATE_ASSIGNEE](state, { id: 1, assignee: {} });
      mutations[types.SET_CONVERSATION_CAN_REPLY](state, {
        conversationId: 1,
        canReply: true,
      });
      mutations[types.UPDATE_MESSAGE_CALL_STATUS](state, { conversationId: 1 });
      expect(state.allConversations).toEqual([]);
    });

    it('updates the call status only for a matching voice message', () => {
      const state = { allConversations: [chat(1, { messages: undefined })] };
      mutations[types.UPDATE_MESSAGE_CALL_STATUS](state, {
        conversationId: 1,
        callSid: 'CA1',
        callStatus: 'completed',
      });
      expect(state.allConversations[0].messages).toBeUndefined();
    });

    it('infers the assignee type when none is given', () => {
      const state = { allConversations: [chat(1)] };
      mutations[types.ASSIGN_AGENT](state, {
        conversationId: 1,
        assignee: { id: 2 },
      });
      expect(state.allConversations[0].meta.assignee_type).toBe('User');
      mutations[types.ASSIGN_AGENT](state, {
        conversationId: 1,
        assignee: null,
      });
      expect(state.allConversations[0].meta.assignee_type).toBeNull();
    });

    it('stores sent attachments without duplicates', () => {
      const state = { attachments: {} };
      const message = {
        status: 'sent',
        conversation_id: 1,
        attachments: [{ id: 1 }],
      };
      mutations[types.ADD_CONVERSATION_ATTACHMENTS](state, message);
      mutations[types.ADD_CONVERSATION_ATTACHMENTS](state, message);
      mutations[types.ADD_CONVERSATION_ATTACHMENTS](state, {
        status: 'sent',
        conversation_id: 1,
      });
      expect(state.attachments[1]).toEqual([{ id: 1 }]);
    });

    it('removes attachments only for sent messages with stored attachments', () => {
      const state = { attachments: { 1: [{ id: 1, message_id: 5 }] } };
      mutations[types.DELETE_CONVERSATION_ATTACHMENTS](state, {
        status: 'progress',
        conversation_id: 1,
        id: 5,
      });
      expect(state.attachments[1]).toHaveLength(1);
      mutations[types.DELETE_CONVERSATION_ATTACHMENTS](state, {
        status: 'sent',
        conversation_id: 2,
        id: 5,
      });
      expect(state.attachments[2]).toBeUndefined();
    });

    it('marks messages as being auto-translated per locale', () => {
      const state = { autoTranslating: {} };
      mutations[types.SET_AUTO_TRANSLATING](state, {
        locale: 'en',
        messageIds: [1, 2],
        translating: true,
      });
      mutations[types.SET_AUTO_TRANSLATING](state, {
        locale: 'en',
        messageIds: [2],
        translating: undefined,
      });
      expect(state.autoTranslating).toEqual({
        en: { 1: true, 2: undefined },
      });
    });

    it('adds an updated chat that is not loaded unless on a mention view', () => {
      const state = { allConversations: [], conversationFilters: undefined };
      mutations[types.UPDATE_CONVERSATION](state, chat(1));
      expect(state.allConversations).toHaveLength(1);
    });

    it('stores the applied filter sort', () => {
      const state = {};
      mutations[types.SET_CONVERSATION_FILTERS_SORT](state, 'priority');
      expect(state.appliedFiltersSortBy).toBe('priority');
    });
  });

  it('builds the filter query only when filters are applied', () => {
    expect(
      getters.getAppliedConversationFiltersQuery({
        appliedFilters: [
          {
            attribute_key: 'status',
            filter_operator: 'equal_to',
            values: ['open'],
            query_operator: 'and',
          },
        ],
      })
    ).toHaveProperty('payload');
    expect(
      getters.getAppliedConversationFiltersQuery({ appliedFilters: [] })
    ).toEqual([]);
  });

  it('replaces the list and resets paging when asked', () => {
    const context = { commit: vi.fn(), dispatch: vi.fn() };
    buildConversationList(
      context,
      { page: 1 },
      { payload: [chat(1)], meta: {} },
      'all',
      { replaceExisting: true }
    );
    expect(context.dispatch).toHaveBeenCalledWith(
      'conversationPage/reset',
      null,
      { root: true }
    );
    expect(context.commit).toHaveBeenCalledWith(
      types.REPLACE_CONVERSATION_LIST,
      [chat(1)]
    );
  });

  describe('auto-translation', () => {
    const message = (id, extra = {}) => ({
      id,
      message_type: 0,
      content_type: 'text',
      content: 'Bonjour',
      content_attributes: {},
      ...extra,
    });
    const context = ({ provider = 'captain', integrations = [] } = {}) => ({
      state: { selectedChatId: 1, autoTranslating: {} },
      commit: vi.fn(),
      dispatch: vi.fn().mockResolvedValue(),
      getters: {
        getAutoTranslate: { enabled: true, locale: 'en', provider },
        getSelectedChat: { messages: [message(1), message(2)] },
      },
      rootGetters: { 'integrations/getAppIntegrations': integrations },
    });

    it('translates a single message', async () => {
      await translateActions.translateMessage(
        {},
        { conversationId: 1, messageId: 2, targetLanguage: 'en' }
      );
      expect(MessageApi.translateMessage).toHaveBeenCalledWith(1, 2, 'en');
    });

    it('loads integrations once before using Google Translate', async () => {
      const ctx = context({ provider: 'google_translate' });
      await Promise.all([
        translateActions.autoTranslateMessages(ctx, 1),
        translateActions.autoTranslateMessages(ctx, 1),
      ]);
      expect(ctx.dispatch).toHaveBeenCalledTimes(1);
      expect(ctx.dispatch).toHaveBeenCalledWith('integrations/get', null, {
        root: true,
      });
    });

    it('skips loading integrations that are already there', async () => {
      const ctx = context({ provider: 'google_translate', integrations: [{}] });
      await translateActions.autoTranslateMessages(ctx, 1);
      expect(ctx.dispatch).not.toHaveBeenCalled();
      expect(MessageApi.autoTranslate).toHaveBeenCalledWith(1, [1, 2]);
    });

    it('does nothing for a chat without messages', async () => {
      const ctx = context();
      ctx.getters.getSelectedChat = {};
      await translateActions.autoTranslateMessages(ctx, 1);
      expect(MessageApi.autoTranslate).not.toHaveBeenCalled();
    });

    it('makes failed messages retryable and alerts unless the feature was switched off', async () => {
      const ctx = context();
      MessageApi.autoTranslate.mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Quota' } },
      });
      await translateActions.autoTranslateMessages(ctx, 1);
      expect(ctx.commit).toHaveBeenLastCalledWith(types.SET_AUTO_TRANSLATING, {
        locale: 'en',
        messageIds: [1, 2],
        translating: undefined,
      });
      expect(useAlert).toHaveBeenCalledTimes(1);

      MessageApi.autoTranslate.mockRejectedValueOnce({
        response: { status: 403 },
      });
      await translateActions.autoTranslateMessages(context(), 1);
      MessageApi.autoTranslate.mockRejectedValueOnce(new Error('offline'));
      await translateActions.autoTranslateMessages(context(), 1);
      expect(useAlert).toHaveBeenCalledTimes(2);
    });
  });

  describe('helpers', () => {
    it('keeps unattended chats with no first reply or a waiting customer', () => {
      const filters = { conversationType: 'unattended', status: 'all' };
      expect(applyPageFilters({ status: 'open' }, filters)).toBe(true);
      expect(
        applyPageFilters(
          { first_reply_created_at: 1, waiting_since: 2 },
          filters
        )
      ).toBe(true);
      expect(applyPageFilters({ first_reply_created_at: 1 }, filters)).toBe(
        false
      );
    });

    it('breaks created-at ties by id', () => {
      expect(
        sortComparator(
          { id: 1, created_at: 5 },
          { id: 2, created_at: 5 },
          'created_at_asc'
        )
      ).toBeLessThan(0);
    });

    it('treats a missing priority as lowest when sorting by priority then age', () => {
      const none = { priority: null, created_at: 1 };
      const high = { priority: 'high', created_at: 2 };
      const key = 'priority_desc_created_at_asc';
      expect(sortComparator(none, high, key)).toBeGreaterThan(0);
      expect(sortComparator(high, none, key)).toBeLessThan(0);
      expect(sortComparator(none, { ...none, created_at: 3 }, key)).toBe(-2);
    });

    it('treats missing activity as oldest when unread counts tie', () => {
      expect(sortComparator({}, {}, 'unread')).toBe(0);
      expect(sortComparator({ last_activity_at: 2 }, {}, 'unread')).toBe(-2);
    });
  });

  describe('advanced filter matching', () => {
    const filter = (attribute_key, filter_operator, values, extra = {}) => ({
      attribute_key,
      filter_operator,
      values,
      ...extra,
    });
    const matches = (filters, conversation) =>
      createFiltersMatcher(filters)(conversation);

    it('finds the contact from the sender, the contact or the contact id', () => {
      const byContact = [filter('contact_id', 'equal_to', [7])];
      expect(matches(byContact, { meta: { sender: { id: 7 } } })).toBe(true);
      expect(matches(byContact, { contact: { id: 7 } })).toBe(true);
      expect(matches(byContact, { contact_id: 7 })).toBe(true);
    });

    it('never matches a date filter against a missing or unreadable date', () => {
      const after = [filter('created_at', 'is_greater_than', ['2026-01-01'])];
      expect(matches(after, { created_at: 'not a date' })).toBe(false);
    });

    it('applies timezone boundaries to single-value timestamp filters only', () => {
      const tz = { timezone: 'Asia/Kolkata' };
      expect(
        matches([filter('created_at', 'is_less_than', '2026-01-01', tz)], {
          created_at: Date.parse('2025-12-31T00:00:00Z') / 1000,
        })
      ).toBe(true);
      expect(
        matches([filter('created_at', 'equal_to', [5], tz)], { created_at: 5 })
      ).toBe(true);
    });

    it('never matches "days before" without a value', () => {
      expect(
        matches([filter('last_activity_at', 'days_before', 3)], {
          last_activity_at: null,
        })
      ).toBe(false);
    });

    it('joins filters with AND when no query operator is given', () => {
      const filters = [
        filter('status', 'equal_to', ['open']),
        filter('priority', 'equal_to', ['high']),
      ];
      expect(matches(filters, { status: 'open', priority: 'high' })).toBe(true);
      expect(matches(filters, { status: 'open', priority: 'low' })).toBe(false);
    });
  });
});
