import { ref } from 'vue';
import { useAlert, useTrack } from 'dashboard/composables';
import { CONVERSATION_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import { useBulkActions } from '../useBulkActions';

/*
 * OneTeam coverage for the conversation list bulk actions: selection,
 * assigning agents, labels and teams, status changes (with the required
 * attribute check before resolving) and running macros. The store is a
 * fake whose dispatch can be made to fail.
 */
const ctx = vi.hoisted(() => ({
  store: null,
  selected: null,
  missing: new Set(),
  t: vi.fn(key => key),
}));

vi.mock('vuex', () => ({ useStore: () => ctx.store }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: ctx.t }) }));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => ctx.selected,
}));
vi.mock('dashboard/composables/useConversationRequiredAttributes', () => ({
  useConversationRequiredAttributes: () => ({
    checkMissingAttributes: attrs => ({ hasMissing: ctx.missing.has(attrs) }),
  }),
}));

const incomplete = {};
const conversations = {
  1: { custom_attributes: incomplete },
  2: { custom_attributes: { ok: true } },
  3: {},
};
const process = 'bulkActions/process';
const clear = 'bulkActions/clearSelectedConversationIds';

describe('useBulkActions (OneTeam)', () => {
  let bulk;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx.missing = new Set([incomplete]);
    ctx.selected = ref([1, 2]);
    ctx.store = {
      dispatch: vi.fn(() => Promise.resolve()),
      getters: { getConversationById: id => conversations[id] },
    };
    bulk = useBulkActions();
  });

  const failNextProcess = () =>
    ctx.store.dispatch.mockImplementationOnce(() =>
      Promise.reject(new Error())
    );

  describe('selection', () => {
    it('tracks one inbox entry per selected conversation', () => {
      bulk.selectConversation(1, 10);
      bulk.selectConversation(2, 10);
      expect(bulk.selectedInboxes.value).toEqual([10, 10]);
      bulk.deSelectConversation(2, 10);
      bulk.deSelectConversation(3, 99);
      expect(bulk.selectedInboxes.value).toEqual([10]);
      expect(ctx.store.dispatch).toHaveBeenCalledWith(
        'bulkActions/removeSelectedConversationIds',
        2
      );
    });

    it('selects or clears the whole list', () => {
      bulk.selectAllConversations(true, ref([{ id: 5, inbox_id: 1 }]));
      expect(ctx.store.dispatch).toHaveBeenCalledWith(
        'bulkActions/setSelectedConversationIds',
        [5]
      );
      expect(bulk.selectedInboxes.value).toEqual([1]);
      bulk.selectAllConversations(false, []);
      expect(ctx.store.dispatch).toHaveBeenLastCalledWith(clear);
      expect(bulk.selectedInboxes.value).toEqual([]);
      expect(bulk.isConversationSelected(1)).toBe(true);
      expect(bulk.isConversationSelected(9)).toBe(false);
    });
  });

  describe.each([
    [
      'onAssignAgent',
      { id: 4, name: 'Ana' },
      { fields: { assignee_id: 4 } },
      'BULK_ACTION.ASSIGN_SUCCESFUL',
      'CONVERSATION.CARD_CONTEXT_MENU.API.AGENT_ASSIGNMENT.SUCCESFUL',
      'BULK_ACTION.ASSIGN_FAILED',
    ],
    [
      'onAssignLabels',
      ['vip'],
      { labels: { add: ['vip'] } },
      'BULK_ACTION.LABELS.ASSIGN_SUCCESFUL',
      'CONVERSATION.CARD_CONTEXT_MENU.API.LABEL_ASSIGNMENT.SUCCESFUL',
      'BULK_ACTION.LABELS.ASSIGN_FAILED',
    ],
  ])('%s', (method, arg, payload, bulkOk, singleOk, failed) => {
    it('applies to the selection and clears it', async () => {
      await bulk[method](arg);
      expect(ctx.store.dispatch).toHaveBeenCalledWith(process, {
        type: 'Conversation',
        ids: [1, 2],
        ...payload,
      });
      expect(ctx.store.dispatch).toHaveBeenCalledWith(clear);
      expect(useAlert).toHaveBeenCalledWith(bulkOk);
    });

    it('applies to one conversation from the context menu', async () => {
      await bulk[method](arg, 9);
      expect(ctx.store.dispatch).toHaveBeenCalledWith(
        process,
        expect.objectContaining({ ids: 9 })
      );
      expect(useAlert).toHaveBeenCalledWith(singleOk);
    });

    it('reports a failure', async () => {
      failNextProcess();
      await bulk[method](arg);
      expect(useAlert).toHaveBeenCalledWith(failed);
    });
  });

  describe('onRemoveLabels', () => {
    it('keeps the bulk selection when removing from one conversation', async () => {
      await bulk.onRemoveLabels(['vip'], 9);
      expect(ctx.store.dispatch).not.toHaveBeenCalledWith(clear);
      expect(useAlert).toHaveBeenCalledWith(
        'CONVERSATION.CARD_CONTEXT_MENU.API.LABEL_REMOVAL.SUCCESFUL'
      );
    });

    it('clears the selection after a bulk removal', async () => {
      await bulk.onRemoveLabels(['vip']);
      expect(ctx.store.dispatch).toHaveBeenCalledWith(process, {
        type: 'Conversation',
        ids: [1, 2],
        labels: { remove: ['vip'] },
      });
      expect(ctx.store.dispatch).toHaveBeenCalledWith(clear);
      expect(useAlert).toHaveBeenCalledWith(
        'BULK_ACTION.LABELS.REMOVE_SUCCESFUL'
      );
    });

    it('reports the failure for the place it came from', async () => {
      failNextProcess();
      await bulk.onRemoveLabels(['vip'], 9);
      expect(useAlert).toHaveBeenLastCalledWith(
        'CONVERSATION.CARD_CONTEXT_MENU.API.LABEL_REMOVAL.FAILED'
      );
      failNextProcess();
      await bulk.onRemoveLabels(['vip']);
      expect(useAlert).toHaveBeenLastCalledWith(
        'BULK_ACTION.LABELS.REMOVE_FAILED'
      );
    });
  });

  it('assigns a team to the selection, or reports the failure', async () => {
    await bulk.onAssignTeamsForBulk({ id: 3 });
    expect(ctx.store.dispatch).toHaveBeenCalledWith(process, {
      type: 'Conversation',
      ids: [1, 2],
      fields: { team_id: 3 },
    });
    expect(useAlert).toHaveBeenCalledWith('BULK_ACTION.TEAMS.ASSIGN_SUCCESFUL');
    failNextProcess();
    await bulk.onAssignTeamsForBulk({ id: 3 });
    expect(useAlert).toHaveBeenLastCalledWith(
      'BULK_ACTION.TEAMS.ASSIGN_FAILED'
    );
  });

  describe('onUpdateConversations', () => {
    it('does nothing without a selection', async () => {
      ctx.selected.value = [];
      await bulk.onUpdateConversations('open');
      expect(ctx.store.dispatch).not.toHaveBeenCalled();
    });

    it('updates the status of every selected conversation', async () => {
      await bulk.onUpdateConversations('snoozed', 123);
      expect(ctx.store.dispatch).toHaveBeenCalledWith(process, {
        type: 'Conversation',
        ids: [1, 2],
        fields: { status: 'snoozed' },
        snoozed_until: 123,
      });
      expect(useAlert).toHaveBeenCalledWith(
        'BULK_ACTION.UPDATE.UPDATE_SUCCESFUL'
      );
    });

    it('skips conversations missing required attributes when resolving', async () => {
      ctx.selected.value = [1, 2, 3, 4];
      await bulk.onUpdateConversations('resolved');
      expect(ctx.store.dispatch).toHaveBeenCalledWith(
        process,
        expect.objectContaining({ ids: [2, 3, 4] })
      );
      expect(useAlert).toHaveBeenCalledWith(
        'BULK_ACTION.RESOLVE.PARTIAL_SUCCESS'
      );
    });

    it('refuses to resolve when every conversation misses attributes', async () => {
      ctx.selected.value = [1];
      await bulk.onUpdateConversations('resolved');
      expect(useAlert).toHaveBeenCalledWith(
        'BULK_ACTION.RESOLVE.ALL_MISSING_ATTRIBUTES'
      );
      ctx.t.mockReturnValueOnce('');
      await bulk.onUpdateConversations('resolved');
      expect(useAlert).toHaveBeenLastCalledWith(
        'Cannot resolve conversations due to missing required attributes'
      );
      expect(ctx.store.dispatch).not.toHaveBeenCalled();
    });

    it('clears the selection without a request when nothing is left to send', async () => {
      // The selection empties between the guard and the update.
      ctx.selected = {
        calls: 0,
        get value() {
          this.calls += 1;
          return this.calls === 1 ? [2] : [];
        },
      };
      bulk = useBulkActions();
      await bulk.onUpdateConversations('open');
      expect(ctx.store.dispatch).toHaveBeenCalledTimes(1);
      expect(ctx.store.dispatch).toHaveBeenCalledWith(clear);
    });

    it('reports a failed update', async () => {
      failNextProcess();
      await bulk.onUpdateConversations('open');
      expect(useAlert).toHaveBeenCalledWith('BULK_ACTION.UPDATE.UPDATE_FAILED');
    });
  });

  describe('onExecuteMacro', () => {
    const resolving = {
      id: 8,
      actions: [{ action_name: 'resolve_conversation' }],
    };

    it('queues the macro and tracks it', async () => {
      await bulk.onExecuteMacro({ id: 8, actions: [] });
      expect(ctx.store.dispatch).toHaveBeenCalledWith('macros/execute', {
        macroId: 8,
        conversationIds: [1, 2],
      });
      expect(useTrack).toHaveBeenCalledWith(
        CONVERSATION_EVENTS.EXECUTED_A_MACRO
      );
      expect(ctx.t).toHaveBeenCalledWith(
        'BULK_ACTION.MACROS.QUEUED',
        { count: 2 },
        2
      );
    });

    it('warns when a resolving macro hits missing attributes', async () => {
      await bulk.onExecuteMacro(resolving);
      expect(ctx.t).toHaveBeenCalledWith(
        'BULK_ACTION.MACROS.QUEUED_WITH_MISSING_ATTRIBUTES',
        { count: 2 },
        2
      );
    });

    it('does not warn for unloaded or complete conversations', async () => {
      ctx.selected.value = [4, 3, 2];
      await bulk.onExecuteMacro(resolving);
      expect(ctx.t).toHaveBeenCalledWith(
        'BULK_ACTION.MACROS.QUEUED',
        { count: 3 },
        3
      );
    });

    it('reports a failed macro', async () => {
      failNextProcess();
      await bulk.onExecuteMacro({ id: 8, actions: [] });
      expect(useAlert).toHaveBeenCalledWith('MACROS.ERROR');
    });
  });
});
