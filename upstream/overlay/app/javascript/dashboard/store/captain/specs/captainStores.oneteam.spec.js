import CaptainDocumentAPI from 'dashboard/api/captain/document';
import CaptainScenarios from 'dashboard/api/captain/scenarios';
import CaptainCustomTools from 'dashboard/api/captain/customTools';
import CaptainInboxes from 'dashboard/api/captain/inboxes';
import CaptainToolsAPI from 'dashboard/api/captain/tools';
import CaptainBulkActionsAPI from 'dashboard/api/captain/bulkActions';
import CaptainFaqSuggestionsAPI from 'dashboard/api/captain/faqSuggestions';
import CopilotMessagesAPI from 'dashboard/api/captain/copilotMessages';
import CaptainAgentSessionsAPI from 'dashboard/api/captain/agentSessions';
import documents from '../document';
import scenarios from '../scenarios';
import customTools from '../customTools';
import inboxes from '../inboxes';
import tools from '../tools';
import responses from '../response';
import bulkActions from '../bulkActions';
import faqSuggestions from '../faqSuggestions';
import copilotMessages from '../copilotMessages';
import agentSessions from '../agentSessions';
import { apiError, buildStore } from '../../specs/oneteamStore';

// vi.mock factories are hoisted above imports, so the helper must be too.
const { mockApi } = vi.hoisted(() => ({
  mockApi: methods => ({
    default: Object.fromEntries(methods.map(name => [name, vi.fn()])),
  }),
}));
vi.mock('dashboard/api/captain/document', () => mockApi(['sync', 'get']));
vi.mock('dashboard/api/captain/scenarios', () => mockApi(['update', 'delete']));
vi.mock('dashboard/api/captain/customTools', () =>
  mockApi(['update', 'delete'])
);
vi.mock('dashboard/api/captain/inboxes', () => mockApi(['delete']));
vi.mock('dashboard/api/captain/tools', () => mockApi(['get']));
vi.mock('dashboard/api/captain/response', () => mockApi(['get']));
vi.mock('dashboard/api/captain/bulkActions', () => mockApi(['create']));
vi.mock('dashboard/api/captain/faqSuggestions', () =>
  mockApi(['approve', 'dismiss', 'get'])
);
vi.mock('dashboard/api/captain/copilotMessages', () => mockApi(['get']));
vi.mock('dashboard/api/captain/agentSessions', () => mockApi(['show']));

describe('Captain stores (OneTeam)', () => {
  let store;

  beforeEach(() => {
    store = buildStore({
      captainDocuments: documents,
      captainScenarios: scenarios,
      captainCustomTools: customTools,
      captainInboxes: inboxes,
      captainTools: tools,
      captainResponses: responses,
      captainBulkActions: bulkActions,
      captainFaqSuggestions: faqSuggestions,
      copilotMessages,
      captainAgentSessions: agentSessions,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('documents', () => {
    it('sets records, list flag and page meta', async () => {
      await store.dispatch('captainDocuments/setFetchingList', true);
      await store.dispatch('captainDocuments/setRecords', {
        records: [{ id: 1 }, { id: 2 }],
        meta: { total_count: '2', page: '1' },
      });
      const { state } = store;
      expect(state.captainDocuments.uiFlags.fetchingList).toBe(true);
      expect(state.captainDocuments.meta).toEqual({ totalCount: 2, page: 1 });
      await store.dispatch('captainDocuments/removeBulkRecords', [1]);
      expect(store.getters['captainDocuments/getRecords']).toEqual([{ id: 2 }]);
    });

    it('marks a synced document as syncing', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-04T10:00:00Z'));
      await store.dispatch('captainDocuments/setRecords', {
        records: [{ id: 1, sync_status: 'done' }, { id: 2 }],
        meta: {},
      });
      await expect(store.dispatch('captainDocuments/sync', 1)).resolves.toBe(1);
      expect(CaptainDocumentAPI.sync).toHaveBeenCalledWith(1);
      expect(store.getters['captainDocuments/getRecords']).toEqual([
        {
          id: 1,
          sync_status: 'syncing',
          sync_in_progress: true,
          last_sync_attempted_at: 1772618400,
          last_sync_error_code: null,
        },
        { id: 2 },
      ]);
    });

    it('reports a failed sync', async () => {
      CaptainDocumentAPI.sync.mockRejectedValue(apiError('Busy'));
      await expect(store.dispatch('captainDocuments/sync', 1)).rejects.toThrow(
        'Busy'
      );
    });
  });

  describe.each([
    ['captainScenarios', CaptainScenarios, { id: 3, assistantId: 9 }],
    ['captainCustomTools', CaptainCustomTools, { id: 3, assistantId: 9 }],
  ])('%s', (name, api, ids) => {
    it('updates and deletes records', async () => {
      store.commit(
        `${name}/SET_${name === 'captainScenarios' ? 'CAPTAINSCENARIO' : 'CAPTAINCUSTOMTOOL'}`,
        [{ id: 3, title: 'Old' }]
      );
      api.update.mockResolvedValue({ data: { id: 3, title: 'New' } });
      await expect(
        store.dispatch(`${name}/update`, { ...ids, title: 'New' })
      ).resolves.toEqual({ id: 3, title: 'New' });
      expect(store.getters[`${name}/getRecord`](3).title).toBe('New');

      api.delete.mockResolvedValue({});
      await expect(store.dispatch(`${name}/delete`, ids)).resolves.toBe(3);
      expect(store.getters[`${name}/getRecords`]).toEqual([]);
      expect(store.getters[`${name}/getUIFlags`]).toMatchObject({
        updatingItem: false,
        deletingItem: false,
      });
    });

    it('reports failures and clears the flags', async () => {
      api.update.mockRejectedValue(apiError('Bad update'));
      api.delete.mockRejectedValue(apiError('Bad delete'));
      await expect(store.dispatch(`${name}/update`, ids)).rejects.toThrow(
        'Bad update'
      );
      await expect(store.dispatch(`${name}/delete`, ids)).rejects.toThrow(
        'Bad delete'
      );
      expect(store.getters[`${name}/getUIFlags`]).toMatchObject({
        updatingItem: false,
        deletingItem: false,
      });
    });
  });

  it('sends the assistant with scenario and custom tool updates as the API expects', async () => {
    CaptainScenarios.update.mockResolvedValue({ data: { id: 3 } });
    CaptainCustomTools.update.mockResolvedValue({ data: { id: 3 } });
    await store.dispatch('captainScenarios/update', {
      id: 3,
      assistantId: 9,
      title: 'T',
    });
    await store.dispatch('captainCustomTools/update', { id: 3, title: 'T' });
    expect(CaptainScenarios.update).toHaveBeenCalledWith(
      { id: 3, assistantId: 9 },
      { title: 'T' }
    );
    expect(CaptainCustomTools.update).toHaveBeenCalledWith(3, { title: 'T' });
  });

  describe('inboxes', () => {
    it('removes an inbox from the assistant', async () => {
      store.commit('captainInboxes/SET_CAPTAININBOX', [{ id: 4 }]);
      CaptainInboxes.delete.mockResolvedValue({});
      await expect(
        store.dispatch('captainInboxes/delete', { inboxId: 4, assistantId: 9 })
      ).resolves.toBe(4);
      expect(CaptainInboxes.delete).toHaveBeenCalledWith({
        inboxId: 4,
        assistantId: 9,
      });
      expect(store.getters['captainInboxes/getRecords']).toEqual([]);
    });

    it('reports a failed removal', async () => {
      CaptainInboxes.delete.mockRejectedValue(apiError('No'));
      await expect(
        store.dispatch('captainInboxes/delete', { inboxId: 4 })
      ).rejects.toThrow('No');
      expect(store.getters['captainInboxes/getUIFlags'].deletingItem).toBe(
        false
      );
    });
  });

  describe('tools', () => {
    it('loads the tools of an assistant', async () => {
      CaptainToolsAPI.get.mockResolvedValue({ data: [{ id: 1 }] });
      await expect(
        store.dispatch('captainTools/getTools', { assistantId: 9 })
      ).resolves.toEqual([{ id: 1 }]);
      expect(CaptainToolsAPI.get).toHaveBeenCalledWith({
        assistant_id: 9,
        signal: expect.any(AbortSignal),
      });
      expect(store.getters['captainTools/getRecords']).toEqual([{ id: 1 }]);
      expect(store.getters['captainTools/getUIFlags'].fetchingList).toBe(false);
    });

    it('drops a superseded request', async () => {
      let resolveFirst;
      CaptainToolsAPI.get
        .mockImplementationOnce(
          () =>
            new Promise(resolve => {
              resolveFirst = resolve;
            })
        )
        .mockResolvedValueOnce({ data: [{ id: 2 }] });
      const first = store.dispatch('captainTools/getTools', { assistantId: 1 });
      const second = store.dispatch('captainTools/getTools', {
        assistantId: 2,
      });
      await second;
      resolveFirst({ data: [{ id: 1 }] });
      await expect(first).resolves.toBeNull();
      expect(store.getters['captainTools/getRecords']).toEqual([{ id: 2 }]);
    });

    it('reports a failed load', async () => {
      CaptainToolsAPI.get.mockRejectedValue(apiError('Down'));
      await expect(
        store.dispatch('captainTools/getTools', { assistantId: 9 })
      ).rejects.toThrow('Down');
    });
  });

  describe('responses', () => {
    it('sets and removes responses', async () => {
      await store.dispatch('captainResponses/setFetchingList', false);
      await store.dispatch('captainResponses/setRecords', {
        records: [{ id: 1 }, { id: 2 }, { id: 3 }],
        meta: { total_count: 3, page: 1 },
      });
      await store.dispatch('captainResponses/removeBulkResponses', [1, 3]);
      expect(store.getters['captainResponses/getRecords']).toEqual([{ id: 2 }]);
    });
  });

  describe('bulk actions', () => {
    it('deletes responses, documents or other records in bulk', async () => {
      CaptainBulkActionsAPI.create.mockResolvedValue({ data: { ids: [1] } });
      await store.dispatch('captainResponses/setRecords', {
        records: [{ id: 1 }, { id: 2 }],
        meta: {},
      });
      await store.dispatch('captainDocuments/setRecords', {
        records: [{ id: 1 }, { id: 2 }],
        meta: {},
      });

      await store.dispatch('captainBulkActions/handleBulkDelete', { ids: [1] });
      expect(CaptainBulkActionsAPI.create).toHaveBeenCalledWith({
        type: 'AssistantResponse',
        ids: [1],
        fields: { status: 'delete' },
      });
      expect(store.getters['captainResponses/getRecords']).toEqual([{ id: 2 }]);

      await store.dispatch('captainBulkActions/handleBulkDelete', {
        type: 'AssistantDocument',
        ids: [1],
      });
      expect(store.getters['captainDocuments/getRecords']).toEqual([{ id: 2 }]);

      await expect(
        store.dispatch('captainBulkActions/handleBulkDelete', {
          type: 'Other',
          ids: [2],
        })
      ).resolves.toEqual({ ids: [1] });
      expect(store.getters['captainResponses/getRecords']).toEqual([{ id: 2 }]);
    });

    it('marks bulk-synced documents as syncing', async () => {
      await store.dispatch('captainDocuments/setRecords', {
        records: [{ id: 1 }],
        meta: {},
      });
      CaptainBulkActionsAPI.create.mockResolvedValueOnce({
        data: { ids: [1] },
      });
      await store.dispatch('captainBulkActions/handleBulkSync', { ids: [1] });
      expect(store.getters['captainDocuments/getRecords'][0].sync_status).toBe(
        'syncing'
      );

      CaptainBulkActionsAPI.create.mockResolvedValueOnce({ data: {} });
      await expect(
        store.dispatch('captainBulkActions/handleBulkSync', { ids: [1] })
      ).resolves.toEqual({});
    });

    it('reports a failed bulk action', async () => {
      CaptainBulkActionsAPI.create.mockRejectedValue(apiError('Locked'));
      await expect(
        store.dispatch('captainBulkActions/processBulkAction', {
          type: 'AssistantResponse',
          actionType: 'approve',
          ids: [1],
        })
      ).rejects.toThrow('Locked');
      expect(store.getters['captainBulkActions/getUIFlags'].isUpdating).toBe(
        false
      );
    });
  });

  describe('FAQ suggestions', () => {
    beforeEach(async () => {
      await store.dispatch('captainFaqSuggestions/setFetchingList', true);
      await store.dispatch('captainFaqSuggestions/setRecords', {
        records: [{ id: 1 }, { id: 2 }],
        meta: { total_count: 2, page: 1 },
      });
    });

    it('approves and dismisses suggestions', async () => {
      CaptainFaqSuggestionsAPI.approve.mockResolvedValue({ data: { id: 7 } });
      await expect(
        store.dispatch('captainFaqSuggestions/approve', {
          id: 1,
          question: 'Q',
          answer: 'A',
        })
      ).resolves.toEqual({ id: 7 });
      expect(CaptainFaqSuggestionsAPI.approve).toHaveBeenCalledWith(1, {
        question: 'Q',
        answer: 'A',
      });
      await expect(
        store.dispatch('captainFaqSuggestions/dismiss', 2)
      ).resolves.toBe(2);
      expect(store.getters['captainFaqSuggestions/getRecords']).toEqual([]);
    });

    it('reports failures', async () => {
      CaptainFaqSuggestionsAPI.approve.mockRejectedValue(apiError('A'));
      CaptainFaqSuggestionsAPI.dismiss.mockRejectedValue(apiError('D'));
      await expect(
        store.dispatch('captainFaqSuggestions/approve', { id: 1 })
      ).rejects.toThrow('A');
      await expect(
        store.dispatch('captainFaqSuggestions/dismiss', 1)
      ).rejects.toThrow('D');
      expect(store.getters['captainFaqSuggestions/getUIFlags']).toMatchObject({
        updatingItem: false,
        deletingItem: false,
      });
    });

    it('counts open suggestions, keeping only the latest answer', async () => {
      expect(store.getters['captainFaqSuggestions/getOpenCount']).toBe(0);
      let resolveFirst;
      CaptainFaqSuggestionsAPI.get
        .mockImplementationOnce(
          () =>
            new Promise(resolve => {
              resolveFirst = resolve;
            })
        )
        .mockResolvedValueOnce({ data: { meta: { total_count: '4' } } });
      const first = store.dispatch('captainFaqSuggestions/fetchOpenCount', 1);
      await store.dispatch('captainFaqSuggestions/fetchOpenCount', 2);
      resolveFirst({ data: { meta: { total_count: 9 } } });
      await first;
      expect(store.getters['captainFaqSuggestions/getOpenCount']).toBe(4);
      expect(CaptainFaqSuggestionsAPI.get).toHaveBeenLastCalledWith({
        assistantId: 2,
        page: 1,
      });
    });

    it('counts zero without meta or after a failure', async () => {
      CaptainFaqSuggestionsAPI.get.mockResolvedValueOnce({ data: {} });
      await store.dispatch('captainFaqSuggestions/fetchOpenCount', 1);
      expect(store.getters['captainFaqSuggestions/getOpenCount']).toBe(0);

      let rejectFirst;
      CaptainFaqSuggestionsAPI.get
        .mockImplementationOnce(
          () =>
            new Promise((_, reject) => {
              rejectFirst = reject;
            })
        )
        .mockResolvedValueOnce({ data: { meta: { total_count: 3 } } });
      const first = store.dispatch('captainFaqSuggestions/fetchOpenCount', 1);
      await store.dispatch('captainFaqSuggestions/fetchOpenCount', 1);
      rejectFirst(new Error('late'));
      await first;
      expect(store.getters['captainFaqSuggestions/getOpenCount']).toBe(3);

      CaptainFaqSuggestionsAPI.get.mockRejectedValueOnce(new Error('down'));
      await store.dispatch('captainFaqSuggestions/fetchOpenCount', 1);
      expect(store.getters['captainFaqSuggestions/getOpenCount']).toBe(0);
    });
  });

  describe('copilot messages', () => {
    const message = (id, threadId, updatedAt = 1) => ({
      id,
      copilot_thread: { id: threadId },
      updated_at: updatedAt,
    });

    it('loads every page of a thread, oldest first', async () => {
      CopilotMessagesAPI.get
        .mockResolvedValueOnce({
          data: { payload: [message(2, 5)], meta: { total_count: 3 } },
        })
        .mockResolvedValueOnce({
          data: { payload: [message(1, 5)], meta: { total_count: 3 } },
        })
        .mockResolvedValueOnce({
          data: { payload: [], meta: { total_count: 3 } },
        });
      await expect(
        store.dispatch('copilotMessages/fetchThread', { threadId: 5 })
      ).resolves.toHaveLength(2);
      expect(CopilotMessagesAPI.get.mock.calls).toEqual([
        [5, { page: 1 }],
        [5, { page: 2 }],
        [5, { page: 3 }],
      ]);
      expect(
        store.getters['copilotMessages/getMessagesByThreadId']('5').map(
          m => m.id
        )
      ).toEqual([1, 2]);
    });

    it('ignores copies older than the one held', async () => {
      await store.dispatch('copilotMessages/upsert', message(1, 5, 10));
      await store.dispatch('copilotMessages/upsert', {
        ...message(1, 5, 5),
        content: 'stale',
      });
      await store.dispatch('copilotMessages/upsert', {
        ...message(1, 5, 20),
        content: 'fresh',
      });
      await store.dispatch('copilotMessages/upsert', { id: 9, updated_at: 1 });
      expect(
        store.getters['copilotMessages/getMessagesByThreadId'](5)[0].content
      ).toBe('fresh');
    });

    it('reports a failed load', async () => {
      CopilotMessagesAPI.get.mockRejectedValue(apiError('Gone'));
      await expect(
        store.dispatch('copilotMessages/fetchThread', { threadId: 5 })
      ).rejects.toThrow('Gone');
    });
  });

  describe('agent sessions', () => {
    const getters = () => ({
      session: store.getters['captainAgentSessions/getSessionByMessageId'](1),
      fetched: store.getters['captainAgentSessions/hasFetched'](1),
      fetching: store.getters['captainAgentSessions/isFetching'](1),
    });

    it('caches a session with camel-cased keys and fetches it once', async () => {
      CaptainAgentSessionsAPI.show.mockResolvedValue({
        data: { tool_calls: [{ tool_name: 'search' }] },
      });
      const first = store.dispatch('captainAgentSessions/fetch', {
        messageId: 1,
      });
      expect(getters().fetching).toBe(true);
      await store.dispatch('captainAgentSessions/fetch', { messageId: 1 });
      await first;
      await store.dispatch('captainAgentSessions/fetch', { messageId: 1 });
      expect(CaptainAgentSessionsAPI.show).toHaveBeenCalledTimes(1);
      expect(getters()).toEqual({
        session: { toolCalls: [{ toolName: 'search' }] },
        fetched: true,
        fetching: false,
      });
    });

    it('caches a missing session for older messages only', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(100_000 * 1000));
      CaptainAgentSessionsAPI.show.mockRejectedValue({
        response: { status: 404 },
      });
      await store.dispatch('captainAgentSessions/fetch', {
        messageId: 1,
        createdAt: 100_000 - 10,
      });
      expect(getters().fetched).toBe(false);

      await store.dispatch('captainAgentSessions/fetch', {
        messageId: 1,
        createdAt: 100_000 - 120,
      });
      expect(getters()).toEqual({
        session: null,
        fetched: true,
        fetching: false,
      });
    });

    it('does not cache other failures', async () => {
      CaptainAgentSessionsAPI.show.mockRejectedValue(new Error('offline'));
      await store.dispatch('captainAgentSessions/fetch', { messageId: 1 });
      expect(getters().fetched).toBe(false);
    });
  });
});
