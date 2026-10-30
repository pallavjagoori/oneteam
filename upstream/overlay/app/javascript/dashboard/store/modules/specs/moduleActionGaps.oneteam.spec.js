import SLAReportsAPI from 'dashboard/api/slaReports';
import AutomationAPI from 'dashboard/api/automation';
import CSATReports from 'dashboard/api/csatReports';
import InboxMembersAPI from 'dashboard/api/inboxMembers';
import TeamsAPI from 'dashboard/api/teams';
import LabelsAPI from 'dashboard/api/labels';
import ConversationInboxAPI from 'dashboard/api/inbox/conversation';
import ConversationAPI from 'dashboard/api/conversations';
import NotificationsAPI from 'dashboard/api/notifications';
import AuditLogsAPI from 'dashboard/api/auditLogs';
import articlesAPI from 'dashboard/api/helpCenter/articles';
import { uploadFile } from 'dashboard/helper/uploadHelper';
import { downloadCsvFile } from 'dashboard/helper/downloadHelper';
import { LocalStorage } from 'shared/helpers/localStorage';
import {
  SIDEBAR_SORT_KEYS,
  SIDEBAR_SORT_SECTIONS,
} from 'dashboard/helper/sidebarSort';
import types from '../../mutation-types';
import slaReports from '../SLAReports';
import automations from '../automations';
import csat from '../csat';
import { actions as inboxMembers } from '../inboxMembers';
import { actions as teamActions } from '../teams/actions';
import labels from '../labels';
import contactLabels from '../contactLabels';
import conversationTypingStatus from '../conversationTypingStatus';
import conversationLabels from '../conversationLabels';
import conversationStats from '../conversationStats';
import conversationWatchers from '../conversationWatchers';
import { createConversationPayload } from '../contactConversations';
import { actions as notificationActions } from '../notifications/actions';
import auditlogs from '../auditlogs';
import { actions as articleActions } from '../helpCenterArticles/actions';
import { actions as categoryActions } from '../helpCenterCategories/actions';
import { actions as portalActions } from '../helpCenterPortals/actions';
import sidebarSortPreferences from '../sidebarSortPreferences';
import { apiError } from '../../specs/oneteamStore';

/*
 * OneTeam coverage for Vuex actions that Chatwoot's own specs skip:
 * downloads, uploads, cache revalidation, superseded requests (audit logs,
 * conversation labels), help center portal/article/category edge cases,
 * notification paging and sidebar sort preferences.
 */
const { mockApi, portalApi } = vi.hoisted(() => ({
  mockApi: methods => ({
    default: Object.fromEntries(methods.map(name => [name, vi.fn()])),
  }),
  portalApi: { deleteLogo: vi.fn(), sendCnameInstructions: vi.fn() },
}));
vi.mock('dashboard/api/slaReports', () => mockApi(['download']));
vi.mock('dashboard/api/automation', () => mockApi(['clone']));
vi.mock('dashboard/api/csatReports', () => mockApi(['download', 'update']));
vi.mock('dashboard/api/inboxMembers', () => mockApi(['show', 'update']));
vi.mock('dashboard/api/teams', () =>
  mockApi(['validateCacheKey', 'refetchAndCommit', 'show'])
);
vi.mock('dashboard/api/labels', () =>
  mockApi(['validateCacheKey', 'refetchAndCommit'])
);
vi.mock('dashboard/api/inbox/conversation', () => ({
  default: {
    url: 'conversations',
    toggleTyping: vi.fn(),
    updateParticipants: vi.fn(),
  },
}));
vi.mock('dashboard/api/conversations', () => mockApi(['updateLabels']));
vi.mock('dashboard/api/notifications', () => mockApi(['get', 'deleteAll']));
vi.mock('dashboard/api/auditLogs', () => mockApi(['get']));
vi.mock('dashboard/api/helpCenter/articles', () =>
  mockApi(['getArticle', 'getArticles', 'bulkTranslate'])
);
vi.mock('dashboard/api/helpCenter/portals', () => ({
  default: class {
    deleteLogo = portalApi.deleteLogo;

    sendCnameInstructions = portalApi.sendCnameInstructions;
  },
}));
vi.mock('dashboard/helper/uploadHelper', () => ({
  uploadFile: vi.fn(),
  uploadExternalImage: vi.fn(),
}));
vi.mock('dashboard/helper/downloadHelper', () => ({
  downloadCsvFile: vi.fn(),
}));
vi.mock('dashboard/helper/AnalyticsHelper', () => ({
  default: { track: vi.fn() },
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('Vuex module actions (OneTeam)', () => {
  const commit = vi.fn();
  const dispatch = vi.fn();

  afterEach(() => vi.clearAllMocks());

  describe('downloads and uploads', () => {
    it('downloads SLA and CSAT reports as CSV', async () => {
      SLAReportsAPI.download.mockResolvedValue({ data: 'sla' });
      await slaReports.actions.download({}, { fileName: 'sla.csv' });
      CSATReports.download.mockResolvedValue({ data: 'csat' });
      await csat.actions.downloadCSATReports({}, { fileName: 'csat.csv' });
      expect(downloadCsvFile.mock.calls).toEqual([
        ['sla.csv', 'sla'],
        ['csat.csv', 'csat'],
      ]);
    });

    it('saves CSAT review notes', async () => {
      CSATReports.update.mockResolvedValue({ data: { id: 1 } });
      await expect(
        csat.actions.update({ commit }, { id: 1, reviewNotes: 'ok' })
      ).resolves.toEqual({ id: 1 });
      expect(CSATReports.update).toHaveBeenCalledWith(1, {
        csat_review_notes: 'ok',
      });
      expect(commit).toHaveBeenCalledWith(types.UPDATE_CSAT_RESPONSE, {
        id: 1,
      });
    });

    it('uploads an automation attachment and wraps a failed clone', async () => {
      uploadFile.mockResolvedValue({ blobId: 'b1' });
      await expect(
        automations.actions.uploadAttachment({}, 'file')
      ).resolves.toBe('b1');
      AutomationAPI.clone.mockRejectedValue('locked');
      await expect(automations.actions.clone({ commit }, 1)).rejects.toThrow(
        'locked'
      );
    });
  });

  it('reads and saves inbox members', () => {
    inboxMembers.get({}, { inboxId: 1 });
    inboxMembers.create({}, { inboxId: 1, agentList: [2] });
    expect(InboxMembersAPI.show).toHaveBeenCalledWith(1);
    expect(InboxMembersAPI.update).toHaveBeenCalledWith({
      inboxId: 1,
      agentList: [2],
    });
  });

  describe('cache revalidation', () => {
    it.each([
      ['teams', teamActions.revalidate, TeamsAPI, { data: [1] }, [1]],
      [
        'labels',
        labels.actions.revalidate,
        LabelsAPI,
        { data: { payload: [2] } },
        [2],
      ],
    ])(
      '%s refetches only on a stale key',
      async (_, revalidate, api, response, data) => {
        api.validateCacheKey.mockResolvedValueOnce(false);
        api.refetchAndCommit.mockResolvedValueOnce(response);
        await revalidate({ commit }, { newKey: 'k' });
        expect(commit).toHaveBeenCalledWith(expect.any(String), data);

        api.validateCacheKey.mockResolvedValueOnce(true);
        await revalidate({ commit }, { newKey: 'k' });
        api.validateCacheKey.mockRejectedValueOnce(new Error('x'));
        await revalidate({ commit }, { newKey: 'k' });
        expect(api.refetchAndCommit).toHaveBeenCalledTimes(1);
      }
    );
  });

  it('shows a team, wrapping failures', async () => {
    TeamsAPI.show.mockResolvedValueOnce({ data: { payload: { id: 1 } } });
    await teamActions.show({ commit }, { id: 1 });
    expect(commit).toHaveBeenCalledWith('SET_TEAM_ITEM', { id: 1 });
    TeamsAPI.show.mockRejectedValueOnce('gone');
    await expect(teamActions.show({ commit }, { id: 1 })).rejects.toThrow(
      'gone'
    );
    expect(commit).toHaveBeenLastCalledWith('SET_TEAM_UI_FLAG', {
      isFetchingItem: false,
    });
  });

  it('sets contact labels', () => {
    contactLabels.actions.setContactLabel({ commit }, { id: 1, data: ['a'] });
    expect(commit).toHaveBeenCalledWith(types.SET_CONTACT_LABELS, {
      id: 1,
      data: ['a'],
    });
  });

  it('sends typing status, ignoring failures', async () => {
    ConversationInboxAPI.toggleTyping.mockRejectedValue(new Error('x'));
    await expect(
      conversationTypingStatus.actions.toggleTyping(
        {},
        { status: 'on', conversationId: 1, isPrivate: false }
      )
    ).resolves.toBeUndefined();
    expect(ConversationInboxAPI.toggleTyping).toHaveBeenCalledWith({
      status: 'on',
      conversationId: 1,
      isPrivate: false,
    });
  });

  describe('superseded requests', () => {
    it('drops audit logs, or their error, once a newer fetch started', async () => {
      const first = deferred();
      const second = deferred();
      AuditLogsAPI.get
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise)
        .mockResolvedValueOnce({ data: {} });
      const a = auditlogs.actions.fetch({ commit }, {});
      const b = auditlogs.actions.fetch({ commit }, {});
      first.resolve({ data: { audit_logs: [] } });
      await expect(a).resolves.toBeNull();
      const c = auditlogs.actions.fetch({ commit });
      second.reject(new Error('x'));
      await expect(b).resolves.toBeNull();
      await expect(c).resolves.toEqual([]);
    });

    it('lets only the latest label update settle the labels', async () => {
      const first = deferred();
      ConversationAPI.updateLabels
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce({ data: { payload: ['b'] } });
      const state = { records: { 7: ['x'] } };
      const a = conversationLabels.actions.update(
        { commit, state },
        { conversationId: 7, labels: ['a'] }
      );
      const b = conversationLabels.actions.update(
        { commit, state },
        { conversationId: 7, labels: ['b'] }
      );
      first.resolve({ data: { payload: ['a'] } });
      await Promise.all([a, b]);
      expect(commit).toHaveBeenLastCalledWith(
        types.SET_CONVERSATION_LABELS_UI_FLAG,
        { isUpdating: false, isError: false }
      );
      expect(
        commit.mock.calls.filter(
          ([type, payload]) =>
            type === types.SET_CONVERSATION_LABELS_UI_FLAG &&
            payload.isUpdating === false
        )
      ).toHaveLength(1);
    });

    it('lets only the latest failed label update roll back', async () => {
      const first = deferred();
      ConversationAPI.updateLabels
        .mockReturnValueOnce(first.promise)
        .mockRejectedValueOnce(new Error('x'));
      const state = { records: { 8: ['x'] } };
      const a = conversationLabels.actions.update(
        { commit, state },
        { conversationId: 8, labels: ['a'] }
      );
      const b = conversationLabels.actions.update(
        { commit, state },
        { conversationId: 8, labels: ['b'] }
      );
      first.reject(new Error('first'));
      await Promise.all([a, b]);
      expect(commit).toHaveBeenLastCalledWith(
        types.SET_CONVERSATION_LABELS_UI_FLAG,
        { isUpdating: false, isError: true }
      );
    });

    it('ignores a count refresh for a view that is no longer shown', () => {
      conversationStats.actions.get(
        { commit, state: { allCount: 0 } },
        { status: 'some-other-view' }
      );
      expect(commit).not.toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('keeps paging while full pages come back', async () => {
      NotificationsAPI.get.mockResolvedValue({
        data: {
          data: {
            payload: Array.from({ length: 15 }, (_, id) => ({ id })),
            meta: {},
          },
        },
      });
      await notificationActions.index({ commit });
      expect(commit).not.toHaveBeenCalledWith(
        types.SET_ALL_NOTIFICATIONS_LOADED
      );
    });

    it.each(['deleteAllRead', 'deleteAll'])(
      '%s clears the deleting flag on failure',
      async action => {
        NotificationsAPI.deleteAll.mockRejectedValue(new Error('x'));
        await notificationActions[action]({ commit });
        expect(commit).toHaveBeenLastCalledWith(
          types.SET_NOTIFICATIONS_UI_FLAG,
          { isDeleting: false }
        );
      }
    );

    it('updates a notification', async () => {
      await notificationActions.updateNotification({ commit }, { id: 1 });
      expect(commit).toHaveBeenCalledWith(types.UPDATE_NOTIFICATION, { id: 1 });
    });
  });

  describe('help center', () => {
    it('loads one article, clearing the flag on failure', async () => {
      articlesAPI.getArticle.mockResolvedValueOnce({
        data: { payload: { id: 4, category_id: 2 } },
      });
      await articleActions.show({ commit }, { id: 4, portalSlug: 'docs' });
      expect(commit).toHaveBeenCalledWith(types.ADD_ARTICLE, {
        id: 4,
        categoryId: 2,
      });
      expect(commit).toHaveBeenCalledWith(types.ADD_ARTICLE_ID, 4);

      articlesAPI.getArticle.mockRejectedValueOnce(new Error('x'));
      await articleActions.show({ commit }, { id: 4, portalSlug: 'docs' });
      expect(commit).toHaveBeenLastCalledWith(types.SET_UI_FLAG, {
        isFetching: false,
      });
    });

    it('publishes an article without a draft as it is', () => {
      articleActions.publishDraft(
        { dispatch, state: { articles: { byId: {} } } },
        { portalSlug: 'docs', articleId: 2 }
      );
      expect(dispatch.mock.calls.at(-1)[1]).not.toHaveProperty('content');
    });

    it('publishes a draft with only the edited content', () => {
      const state = { articles: { byId: { 1: { draftContent: 'new' } } } };
      articleActions.publishDraft(
        { dispatch, state },
        { portalSlug: 'docs', articleId: 1, status: 'published' }
      );
      expect(dispatch).toHaveBeenCalledWith('update', {
        portalSlug: 'docs',
        articleId: 1,
        status: 'published',
        draft_title: null,
        draft_content: null,
        content: 'new',
      });
    });

    it('reports a failed meta refresh', async () => {
      articlesAPI.getArticles.mockRejectedValue(apiError('Down'));
      await expect(
        articleActions.updateArticleMeta({ commit }, { portalSlug: 'docs' })
      ).rejects.toThrow('Down');
    });

    it('translates articles in bulk, not forcing by default', async () => {
      articlesAPI.bulkTranslate.mockResolvedValue({ data: { queued: 2 } });
      await expect(
        articleActions.bulkTranslate(
          {},
          { portalSlug: 'docs', articleIds: [1, 2], locale: 'fr' }
        )
      ).resolves.toEqual({ queued: 2 });
      expect(articlesAPI.bulkTranslate).toHaveBeenCalledWith({
        portalSlug: 'docs',
        articleIds: [1, 2],
        locale: 'fr',
        categoryId: undefined,
        force: false,
      });
    });

    it('skips loading categories without a portal', async () => {
      await expect(categoryActions.index({ commit }, {})).resolves.toBe('');
    });

    it('deletes a portal logo, reporting failures', async () => {
      portalApi.deleteLogo.mockResolvedValueOnce({});
      await portalActions.deleteLogo({ commit }, { portalSlug: 'docs' });
      portalApi.deleteLogo.mockRejectedValueOnce(apiError('No logo'));
      await expect(
        portalActions.deleteLogo({ commit }, { portalSlug: 'docs' })
      ).rejects.toThrow('No logo');
      expect(commit).toHaveBeenLastCalledWith(expect.any(String), {
        uiFlags: { isUpdating: false },
        portalSlug: 'docs',
      });
    });

    it('updates and switches portals', async () => {
      await portalActions.updatePortal({ commit }, { slug: 'docs' });
      await portalActions.switchPortal({ commit }, true);
      expect(commit.mock.calls.map(([, payload]) => payload)).toEqual([
        { slug: 'docs' },
        { isSwitching: true },
      ]);
    });

    it('sends CNAME instructions, reporting failures', async () => {
      portalApi.sendCnameInstructions.mockResolvedValueOnce({});
      await portalActions.sendCnameInstructions(
        {},
        { portalSlug: 'docs', email: 'a@b.c' }
      );
      expect(portalApi.sendCnameInstructions).toHaveBeenCalledWith(
        'docs',
        'a@b.c'
      );
      portalApi.sendCnameInstructions.mockRejectedValueOnce(apiError('Bad'));
      await expect(
        portalActions.sendCnameInstructions({}, { portalSlug: 'docs' })
      ).rejects.toThrow('Bad');
    });
  });

  it('starts a conversation without a first message', () => {
    const payload = createConversationPayload({
      params: { inboxId: 1, sourceId: 's' },
      contactId: 2,
      files: [],
    });
    expect(payload.has('message[content]')).toBe(false);
    expect(payload.get('contact_id')).toBe('2');
  });

  it('refreshes unread counts when the user becomes the first watcher', async () => {
    vi.useFakeTimers();
    ConversationInboxAPI.updateParticipants.mockResolvedValue({
      data: [{ id: 1 }],
    });
    await conversationWatchers.actions.update(
      {
        commit,
        dispatch,
        state: { records: {} },
        rootGetters: {
          getCurrentUserID: 1,
          getCurrentAccountId: 1,
          'accounts/isFeatureEnabledonAccount': () => true,
        },
      },
      { conversationId: 5, userIds: [1] }
    );
    expect(dispatch).toHaveBeenCalledWith(
      'conversationUnreadCounts/get',
      {},
      { root: true }
    );
    vi.useRealTimers();
  });

  describe('sidebar sort preferences', () => {
    const { actions } = sidebarSortPreferences;

    afterEach(() => vi.restoreAllMocks());

    it('uses defaults without a signed-in user and account', () => {
      actions.initialize({ commit, rootGetters: {} });
      expect(commit).toHaveBeenCalledWith('SET_SIDEBAR_SORT_PREFERENCES', {
        preferences: expect.any(Object),
        storageKey: null,
      });
    });

    it('saves a choice under the user and account when no key is stored yet', () => {
      const update = vi
        .spyOn(LocalStorage, 'updateJsonStore')
        .mockImplementation(() => {});
      const section = SIDEBAR_SORT_SECTIONS.FOLDERS;
      const sortBy = SIDEBAR_SORT_KEYS.CREATED_ASC;
      actions.setSectionSort(
        {
          commit,
          rootGetters: { getCurrentUserID: 1, getCurrentAccountId: 2 },
          state: { storageKey: null, preferences: {} },
        },
        { section, sortBy }
      );
      expect(update).toHaveBeenCalledWith(
        expect.any(String),
        '1:2',
        expect.objectContaining({ [section]: sortBy })
      );
    });
  });
});
