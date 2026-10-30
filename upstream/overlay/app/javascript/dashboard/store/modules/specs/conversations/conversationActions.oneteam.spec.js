import ConversationApi from 'dashboard/api/inbox/conversation';
import MessageApi from 'dashboard/api/inbox/message';
import * as Sentry from '@sentry/vue';
import installArrayHelpers from 'dashboard/helper/commons';
import actions from '../../conversations/actions';
import types from '../../../mutation-types';

/*
 * OneTeam coverage for the conversations Vuex actions that Chatwoot's own
 * action spec leaves out: superseded list requests, message sending and
 * retrying, contact-info refreshes, filters, mute, priority and the small
 * pass-through actions. API modules are mocked; commit/dispatch are spies.
 */
const { mockApi } = vi.hoisted(() => ({
  mockApi: methods => ({
    default: Object.fromEntries(methods.map(name => [name, vi.fn()])),
  }),
}));
vi.mock('dashboard/api/inbox/conversation', () =>
  mockApi([
    'show',
    'get',
    'filter',
    'getAllAttachments',
    'updateCustomAttributes',
    'toggleStatus',
    'getContactInfoRequestAvailability',
    'requestContactInfo',
    'mute',
    'unmute',
    'togglePriority',
  ])
);
vi.mock('dashboard/api/inbox/message', () => ({
  default: {
    url: '/messages',
    getPreviousMessages: vi.fn(),
    create: vi.fn(),
    retry: vi.fn(),
  },
}));
vi.mock('../../conversations/helpers/actionHelpers', async importOriginal => ({
  ...(await importOriginal()),
  buildConversationList: vi.fn(),
}));
vi.mock('@sentry/vue', () => ({
  setContext: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock('dashboard/helper/voice', () => ({
  handleVoiceCallCreated: vi.fn(),
  handleVoiceCallUpdated: vi.fn(),
  syncConversationCallVisibility: vi.fn(),
}));

installArrayHelpers();

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Lets pending promise callbacks run, so a request reaches its API call.
const ticks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('conversation actions (OneTeam)', () => {
  const commit = vi.fn();
  const dispatch = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
    dispatch.mockReset();
  });

  describe('list requests', () => {
    const state = {
      conversationFilters: { page: 1 },
      chatSortFilter: 'latest',
    };

    it('stops when a newer list request starts while counts are pending', async () => {
      const counts = deferred();
      dispatch.mockReturnValueOnce(counts.promise).mockResolvedValue('count');
      ConversationApi.get.mockResolvedValue({ data: { data: {} } });
      const first = actions.fetchAllConversations({ commit, state, dispatch });
      const second = actions.fetchAllConversations({ commit, state, dispatch });
      counts.resolve('old');
      await Promise.all([first, second]);
      expect(ConversationApi.get).toHaveBeenCalledTimes(1);
    });

    it('ignores the answer and the error of a superseded list request', async () => {
      dispatch.mockResolvedValue('count');
      const answer = deferred();
      const failure = deferred();
      ConversationApi.get
        .mockReturnValueOnce(answer.promise)
        .mockReturnValueOnce(failure.promise)
        .mockResolvedValueOnce({ data: { data: {} } });
      const first = actions.fetchAllConversations({ commit, state, dispatch });
      await ticks();
      const second = actions.fetchAllConversations({ commit, state, dispatch });
      answer.resolve({ data: { data: {} } });
      await first;
      await ticks();
      const third = actions.fetchAllConversations({ commit, state, dispatch });
      failure.reject(new Error('aborted'));
      await Promise.all([second, third]);
      expect(commit).not.toHaveBeenCalledWith(types.CLEAR_LIST_LOADING_STATUS);
    });

    it('clears the loading state when the list request fails', async () => {
      dispatch.mockResolvedValue('count');
      ConversationApi.get.mockRejectedValue(new Error('down'));
      await actions.fetchAllConversations({ commit, state, dispatch });
      expect(commit).toHaveBeenCalledWith(types.CLEAR_LIST_LOADING_STATUS);
    });

    it('uses the pinned sort of applied filters and rethrows filter errors', async () => {
      dispatch.mockResolvedValue('count');
      ConversationApi.filter.mockRejectedValue(new Error('bad filter'));
      await expect(
        actions.fetchFilteredConversations(
          { commit, dispatch, state: { ...state, appliedFiltersSortBy: 'x' } },
          { page: 1 }
        )
      ).rejects.toThrow('bad filter');
      expect(ConversationApi.filter).toHaveBeenCalledWith(
        { page: 1, sortBy: 'x' },
        expect.anything()
      );
      expect(commit).toHaveBeenCalledWith(types.CLEAR_LIST_LOADING_STATUS);
    });

    it('drops superseded filter requests at every step', async () => {
      const counts = deferred();
      dispatch.mockReturnValueOnce(counts.promise).mockResolvedValue('count');
      const answer = deferred();
      const failure = deferred();
      ConversationApi.filter
        .mockReturnValueOnce(answer.promise)
        .mockReturnValueOnce(failure.promise)
        .mockResolvedValue({ data: {} });
      const run = () =>
        actions.fetchFilteredConversations(
          { commit, dispatch, state },
          { page: 1, sortBy: 'created_at' }
        );
      const a = run();
      const b = run();
      counts.resolve('old');
      await a;
      await ticks();
      const c = run();
      answer.resolve({ data: {} });
      await b;
      await ticks();
      const d = run();
      failure.reject(new Error('aborted'));
      await Promise.all([c, d]);
      expect(commit).not.toHaveBeenCalledWith(types.CLEAR_LIST_LOADING_STATUS);
    });

    it('aborts list requests on demand', () => {
      actions.invalidateConversationListRequests({ commit });
      expect(commit).toHaveBeenCalledWith(types.CLEAR_LIST_LOADING_STATUS);
    });
  });

  it('empties the list and clears the selected chat', () => {
    actions.emptyAllConversations({ commit });
    actions.clearSelectedState({ commit });
    expect(commit.mock.calls).toEqual([
      [types.EMPTY_ALL_CONVERSATION],
      [types.CLEAR_CURRENT_CHAT_WINDOW],
    ]);
  });

  describe('message history', () => {
    it('marks the start reached when an "after" page comes back empty', async () => {
      MessageApi.getPreviousMessages.mockResolvedValue({
        data: { meta: {}, payload: [] },
      });
      await actions.fetchPreviousMessages(
        { commit, dispatch },
        { conversationId: 1, after: 5 }
      );
      expect(commit).toHaveBeenCalledWith(types.SET_ALL_MESSAGES_LOADED, 1);
    });

    it('does not mark the start for a full page', async () => {
      MessageApi.getPreviousMessages.mockResolvedValue({
        data: {
          meta: {},
          payload: Array.from({ length: 20 }, (_, id) => ({ id })),
        },
      });
      await actions.fetchPreviousMessages(
        { commit, dispatch },
        { conversationId: 2, before: 50 }
      );
      expect(commit).not.toHaveBeenCalledWith(types.SET_ALL_MESSAGES_LOADED, 2);
    });

    it('reports attachment errors to Sentry and still stores an empty list', async () => {
      ConversationApi.getAllAttachments.mockRejectedValue(new Error('down'));
      await actions.fetchAllAttachments({ commit }, 3);
      expect(Sentry.setContext).toHaveBeenCalledWith('Conversation', { id: 3 });
      expect(Sentry.captureException).toHaveBeenCalled();
      expect(commit).toHaveBeenCalledWith(types.SET_ALL_ATTACHMENTS, {
        id: 3,
        data: [],
      });
    });

    it('skips syncing an unknown conversation', async () => {
      await actions.syncActiveConversationMessages(
        {
          commit,
          dispatch,
          state: { allConversations: [], syncConversationsMessages: {} },
        },
        { conversationId: 1 }
      );
      expect(MessageApi.getPreviousMessages).not.toHaveBeenCalled();
    });

    it('records the last message id only when the chat has messages', async () => {
      const state = {
        allConversations: [
          { id: 1, messages: [{ id: 4 }, { id: 9 }] },
          { id: 2, messages: [] },
        ],
      };
      await actions.setConversationLastMessageId(
        { commit, state },
        { conversationId: 1 }
      );
      await actions.setConversationLastMessageId(
        { commit, state },
        { conversationId: 2 }
      );
      await actions.setConversationLastMessageId(
        { commit, state },
        { conversationId: 3 }
      );
      expect(commit.mock.calls).toEqual([
        [
          types.SET_LAST_MESSAGE_ID_IN_SYNC_CONVERSATION,
          { conversationId: 1, messageId: 9 },
        ],
      ]);
    });
  });

  describe('status', () => {
    it('saves custom attributes before changing the status', async () => {
      ConversationApi.toggleStatus.mockResolvedValue({
        data: { payload: { current_status: 'resolved', snoozed_until: null } },
      });
      await actions.toggleStatus(
        { commit },
        { conversationId: 1, status: 'resolved', customAttributes: { a: 1 } }
      );
      expect(ConversationApi.updateCustomAttributes).toHaveBeenCalledWith({
        conversationId: 1,
        customAttributes: { a: 1 },
      });
      expect(commit.mock.calls.map(([type]) => type)).toEqual([
        types.UPDATE_CONVERSATION_CUSTOM_ATTRIBUTES,
        types.CHANGE_CONVERSATION_STATUS,
      ]);
    });

    it('tolerates an empty status answer', async () => {
      ConversationApi.toggleStatus.mockResolvedValue({});
      await actions.toggleStatus(
        { commit },
        { conversationId: 1, status: 'open' }
      );
      expect(commit).toHaveBeenCalledWith(types.CHANGE_CONVERSATION_STATUS, {
        conversationId: 1,
        status: undefined,
        snoozedUntil: undefined,
      });
    });
  });

  describe('sending messages', () => {
    it('creates a pending message and sends it', async () => {
      await actions.createPendingMessageAndSend(
        { dispatch },
        { conversationId: 1, message: 'Hi' }
      );
      expect(dispatch).toHaveBeenCalledWith(
        'sendMessageWithData',
        expect.objectContaining({ conversation_id: 1, content: 'Hi' })
      );
    });

    it('sends a new message and stores the sent copy', async () => {
      MessageApi.create.mockResolvedValue({ data: { id: 5 } });
      await actions.sendMessageWithData(
        { commit },
        { conversation_id: 1, id: 'tmp' }
      );
      expect(commit.mock.calls).toEqual([
        [
          types.ADD_MESSAGE,
          { conversation_id: 1, id: 'tmp', status: 'progress' },
        ],
        [types.ADD_MESSAGE, { id: 5, status: 'sent' }],
        [types.ADD_CONVERSATION_ATTACHMENTS, { id: 5, status: 'sent' }],
      ]);
    });

    it('retries a message that failed on the channel', async () => {
      MessageApi.retry.mockResolvedValue({ data: { id: 5 } });
      await actions.sendMessageWithData(
        { commit },
        {
          conversation_id: 1,
          id: 5,
          status: 'failed',
          content_attributes: { external_error: 'blocked' },
        }
      );
      expect(MessageApi.retry).toHaveBeenCalledWith(1, 5);
    });

    it('marks the message failed with the server error, or none', async () => {
      const serverError = { response: { data: { error: 'Too big' } } };
      MessageApi.create.mockRejectedValueOnce(serverError);
      await expect(
        actions.sendMessageWithData({ commit }, { conversation_id: 1, id: 't' })
      ).rejects.toBe(serverError);
      expect(commit).toHaveBeenLastCalledWith(types.ADD_MESSAGE, {
        conversation_id: 1,
        id: 't',
        meta: { error: 'Too big' },
        status: 'failed',
      });

      MessageApi.create.mockRejectedValueOnce(new Error('offline'));
      await expect(
        actions.sendMessageWithData({ commit }, { conversation_id: 1, id: 't' })
      ).rejects.toThrow('offline');
      expect(commit.mock.calls.at(-1)[1].meta).toEqual({ error: undefined });
    });
  });

  describe('contact info requests', () => {
    it('checks availability and sends a request', async () => {
      const { signal } = new AbortController();
      ConversationApi.getContactInfoRequestAvailability.mockResolvedValue({
        data: { available: true },
      });
      await expect(
        actions.getContactInfoRequestAvailability(
          {},
          { conversationId: 1, signal }
        )
      ).resolves.toEqual({ available: true });
      expect(
        ConversationApi.getContactInfoRequestAvailability
      ).toHaveBeenCalledWith(1, { signal });

      ConversationApi.requestContactInfo.mockResolvedValue({ data: { id: 8 } });
      await expect(actions.requestContactInfo({ commit }, 1)).resolves.toEqual({
        id: 8,
      });
      expect(commit).toHaveBeenCalledWith(types.ADD_MESSAGE, { id: 8 });
    });

    const source = id => ({
      conversation: { contact_inbox: { source_id: id } },
    });
    const request = (state, extra = {}) => ({
      conversation_id: 1,
      content_attributes: { whatsapp_contact_info: { type: 'request', state } },
      ...extra,
    });

    it('refreshes every conversation sharing the contact source once the request ends', () => {
      const state = {
        allConversations: [
          { id: 2, messages: [source('s')] },
          { id: 3, messages: [source('x')] },
          { id: 4 },
        ],
      };
      actions.updateMessage(
        { commit, dispatch, state },
        request('shared', source('s'))
      );
      expect(dispatch.mock.calls).toEqual([
        ['getConversation', 1],
        ['getConversation', 2],
      ]);
    });

    it('refreshes only the message conversation without a source, or none without ids', () => {
      actions.updateMessage(
        { commit, dispatch, state: {} },
        request('pending', { status: 'failed' })
      );
      actions.updateMessage(
        { commit, dispatch, state: {} },
        request('identity_conflict', { conversation_id: null, ...source('s') })
      );
      actions.updateMessage(
        { commit, dispatch, state: {} },
        request('pending')
      );
      expect(dispatch.mock.calls).toEqual([['getConversation', 1]]);
    });
  });

  it('adds unattended conversations only on the unattended view', () => {
    const conversation = { id: 1 };
    actions.addUnattended(
      { dispatch, rootState: { route: { name: 'inbox_dashboard' } } },
      conversation
    );
    actions.addUnattended(
      { dispatch, rootState: { route: { name: 'conversation_unattended' } } },
      conversation
    );
    expect(dispatch.mock.calls).toEqual([['updateConversation', conversation]]);
  });

  describe('pass-through actions', () => {
    it.each([
      ['setChatStatusFilter', types.CHANGE_CHAT_STATUS_FILTER],
      ['updateAssignee', types.UPDATE_ASSIGNEE],
      ['setActiveInbox', types.SET_ACTIVE_INBOX],
      ['updateChatListFilters', types.UPDATE_CHAT_LIST_FILTERS],
    ])('%s commits its payload', (action, type) => {
      actions[action]({ commit }, { x: 1 });
      expect(commit).toHaveBeenCalledWith(type, { x: 1 });
    });

    it('clears the conversation filters', () => {
      actions.clearConversationFilters({ commit });
      expect(commit).toHaveBeenCalledWith(types.CLEAR_CONVERSATION_FILTERS);
    });

    it('updates the conversation contact, and the contact store when it has an id', () => {
      actions.updateConversationContact({ commit }, { id: 4, name: 'Jo' });
      actions.updateConversationContact({ commit }, { name: 'Anon' });
      expect(commit.mock.calls).toEqual([
        [`contacts/${types.SET_CONTACT_ITEM}`, { id: 4, name: 'Jo' }],
        [types.UPDATE_CONVERSATION_CONTACT, { id: 4, name: 'Jo' }],
        [types.UPDATE_CONVERSATION_CONTACT, { name: 'Anon' }],
      ]);
    });

    it('sets the chat priority', () => {
      actions.setCurrentChatPriority(
        { commit },
        { priority: 'high', conversationId: 1 }
      );
      expect(commit).toHaveBeenCalledWith(types.ASSIGN_PRIORITY, {
        priority: 'high',
        conversationId: 1,
      });
    });
  });

  describe('conversation settings', () => {
    it('unmutes, ignoring failures', async () => {
      ConversationApi.unmute.mockResolvedValueOnce({});
      await actions.unmuteConversation({ commit }, 1);
      expect(commit).toHaveBeenCalledWith(types.UNMUTE_CONVERSATION);
      ConversationApi.unmute.mockRejectedValueOnce(new Error('x'));
      await actions.unmuteConversation({ commit }, 1);
      expect(commit).toHaveBeenCalledTimes(1);
    });

    it('rethrows a failed custom attribute update', async () => {
      ConversationApi.updateCustomAttributes.mockRejectedValue('bad');
      await expect(
        actions.updateCustomAttributes(
          { commit },
          { conversationId: 1, customAttributes: {} }
        )
      ).rejects.toThrow('bad');
    });

    it('applies filters as page 1 with an optional sort override', async () => {
      dispatch.mockResolvedValue('done');
      const filters = [
        {
          attribute_key: 'status',
          filter_operator: 'equal_to',
          values: ['open'],
          query_operator: 'and',
        },
      ];
      await expect(
        actions.applyConversationFilters(
          { commit, dispatch },
          { filters, sortBy: 'priority' }
        )
      ).resolves.toBe('done');
      expect(commit.mock.calls.map(([type]) => type)).toEqual([
        types.SET_CONVERSATION_FILTERS,
        types.SET_CONVERSATION_FILTERS_SORT,
        types.EMPTY_ALL_CONVERSATION,
      ]);
      expect(commit).toHaveBeenCalledWith(
        types.SET_CONVERSATION_FILTERS_SORT,
        'priority'
      );
      expect(dispatch).toHaveBeenCalledWith(
        'conversationPage/reset',
        {},
        { root: true }
      );
      expect(dispatch).toHaveBeenLastCalledWith('fetchFilteredConversations', {
        queryData: expect.any(Object),
        page: 1,
      });

      await actions.applyConversationFilters({ commit, dispatch }, { filters });
      expect(commit).toHaveBeenCalledWith(
        types.SET_CONVERSATION_FILTERS_SORT,
        null
      );
    });

    it('assigns a priority, ignoring failures', async () => {
      ConversationApi.togglePriority.mockResolvedValueOnce({});
      await actions.assignPriority(
        { dispatch },
        { conversationId: 1, priority: 'low' }
      );
      expect(dispatch).toHaveBeenCalledWith('setCurrentChatPriority', {
        priority: 'low',
        conversationId: 1,
      });
      ConversationApi.togglePriority.mockRejectedValueOnce(new Error('x'));
      await actions.assignPriority(
        { dispatch },
        { conversationId: 1, priority: 'low' }
      );
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });
});
