import types from '../../mutation-types';
import agents from '../agents';
import attributes from '../attributes';
import auditlogs from '../auditlogs';
import automations from '../automations';
import campaigns from '../campaigns';
import contactConversations from '../contactConversations';
import contactLabels from '../contactLabels';
import contactNotes from '../contactNotes';
import conversationLabels from '../conversationLabels';
import conversationMetadata from '../conversationMetadata';
import conversationTypingStatus from '../conversationTypingStatus';
import customViews from '../customViews';
import inboxAssignableAgents from '../inboxAssignableAgents';
import labels from '../labels';
import macros from '../macros';
import teamMembers from '../teamMembers';
import teams from '../teams';
import userNotificationSettings from '../userNotificationSettings';
import webhooks from '../webhooks';
import csat from '../csat';
import bulkActions from '../bulkActions';
import agentCapacityPolicies from '../agentCapacityPolicies';
import { getMetaDebounceKey } from '../conversationStats';
import { getters as articleGetters } from '../helpCenterArticles/getters';
import { mutations as articleMutations } from '../helpCenterArticles/mutations';
import { getters as categoryGetters } from '../helpCenterCategories/getters';
import { mutations as categoryMutations } from '../helpCenterCategories/mutations';
import { getters as portalGetters } from '../helpCenterPortals/getters';
import {
  mutations as portalMutations,
  types as portalTypes,
} from '../helpCenterPortals/mutations';
import { getters as notificationGetters } from '../notifications/getters';
import { mutations as notificationMutations } from '../notifications/mutations';
import { sortComparator as notificationSort } from '../notifications/helpers';

/*
 * OneTeam coverage for the small getters and mutations across the Vuex
 * modules that Chatwoot's own specs skip: UI flag setters, lookups that
 * fall back to an empty value, camelized lists and help center/notification
 * bookkeeping. Each is a pure function of state, so no API is involved.
 */
describe('Vuex module getters and mutations (OneTeam)', () => {
  describe('UI flag mutations merge new flags into the old ones', () => {
    it.each([
      ['attributes', attributes],
      ['auditlogs', auditlogs],
      ['automations', automations],
      ['campaigns', campaigns],
      ['contactNotes', contactNotes],
      ['customViews', customViews],
      ['inboxAssignableAgents', inboxAssignableAgents],
      ['labels', labels],
      ['macros', macros],
      ['teamMembers', teamMembers],
      ['webhooks', webhooks],
      ['teams', teams],
    ])('%s', (_, module) => {
      const name = Object.keys(module.mutations).find(key =>
        key.endsWith('UI_FLAG')
      );
      const state = { uiFlags: { a: true, b: false } };
      module.mutations[name](state, { b: true });
      expect(state.uiFlags).toEqual({ a: true, b: true });
    });
  });

  it('sets each agent status flag', () => {
    const state = { uiFlags: {} };
    agents.mutations[types.SET_AGENT_FETCHING_STATUS](state, true);
    agents.mutations[types.SET_AGENT_CREATING_STATUS](state, true);
    agents.mutations[types.SET_AGENT_UPDATING_STATUS](state, false);
    agents.mutations[types.SET_AGENT_DELETING_STATUS](state, true);
    expect(state.uiFlags).toEqual({
      isFetching: true,
      isCreating: true,
      isUpdating: false,
      isDeleting: true,
    });
  });

  describe('lookups', () => {
    it('return an empty value for unknown ids', () => {
      const empty = { records: {} };
      expect(
        agents.getters.getAgentById({ records: [{ id: 2 }] })('2')
      ).toEqual({ id: 2 });
      expect(agents.getters.getAgentById({ records: [] })(1)).toEqual({});
      expect(contactLabels.getters.getContactLabels(empty)(1)).toEqual([]);
      expect(
        conversationLabels.getters.getConversationLabels(empty)(1)
      ).toEqual([]);
      expect(
        conversationMetadata.getters.getConversationMetadata(empty)(1)
      ).toEqual({});
      expect(teamMembers.getters.getTeamMembers(empty)(1)).toEqual([]);
      expect(
        labels.getters.getLabelById({ records: [{ id: 3 }] })('3')
      ).toEqual({ id: 3 });
      expect(labels.getters.getLabelById({ records: [] })(1)).toEqual({});
      expect(
        teams.getters.getTeamById({ records: { 1: { id: 1 } } })('1')
      ).toEqual({ id: 1 });
      expect(teams.getters.getTeamById(empty)(1)).toEqual({});
      expect(teams.getters.getTeam(empty)(1)).toEqual({});
      expect(
        inboxAssignableAgents.getters.getAssignableAgents(empty)(1)
      ).toEqual([]);
    });

    it('sort sidebar labels by title', () => {
      const state = {
        records: [
          { id: 1, title: 'zeta', show_on_sidebar: true },
          { id: 2, title: 'alpha', show_on_sidebar: true },
          { id: 3, title: 'hidden', show_on_sidebar: false },
        ],
      };
      expect(labels.getters.getLabelsOnSidebar(state).map(l => l.id)).toEqual([
        2, 1,
      ]);
    });
  });

  it('splits custom attributes by model, camelized', () => {
    const state = {
      records: [
        { id: 1, attribute_model: 'conversation_attribute', display_name: 'A' },
        { id: 2, attribute_model: 'contact_attribute', display_name: 'B' },
      ],
    };
    expect(attributes.getters.getConversationAttributes(state)).toEqual([
      { id: 1, attributeModel: 'conversation_attribute', displayName: 'A' },
    ]);
    expect(attributes.getters.getContactAttributes(state)).toEqual([
      { id: 2, attributeModel: 'contact_attribute', displayName: 'B' },
    ]);
  });

  it('exposes audit logs, their flags and merged meta', () => {
    const state = { records: [1], uiFlags: { x: 1 }, meta: { perPage: 25 } };
    expect(auditlogs.getters.getAuditLogs(state)).toEqual([1]);
    expect(auditlogs.getters.getUIFlags(state)).toEqual({ x: 1 });
    auditlogs.mutations[types.SET_AUDIT_LOGS_META](state, { currentPage: 2 });
    expect(auditlogs.getters.getMeta(state)).toEqual({
      perPage: 25,
      currentPage: 2,
    });
  });

  describe('contact conversations', () => {
    it('sorts newest first, then by id, and lists them camelized', () => {
      const state = {
        records: {
          1: [
            { id: 1, created_at: 5 },
            { id: 3, created_at: 9 },
            { id: 2, created_at: 5, inbox_id: 4 },
          ],
        },
      };
      expect(
        contactConversations.getters
          .getContactConversation(state)('1')
          .map(c => c.id)
      ).toEqual([3, 2, 1]);
      expect(
        contactConversations.getters.getContactConversation(state)(9)
      ).toEqual([]);
      expect(
        contactConversations.getters.getAllConversationsByContactId(state)(1)[2]
      ).toEqual({ id: 2, createdAt: 5, inboxId: 4 });
      expect(
        contactConversations.getters.getAllConversationsByContactId(state)(9)
      ).toEqual([]);
    });

    it('merges an existing conversation and deletes a contact', () => {
      const state = { records: { 1: [{ id: 5, status: 'open' }], 2: [] } };
      contactConversations.mutations[types.ADD_CONTACT_CONVERSATION](state, {
        id: 1,
        data: { id: 5, status: 'resolved' },
      });
      expect(state.records[1]).toEqual([{ id: 5, status: 'resolved' }]);
      contactConversations.mutations[types.DELETE_CONTACT_CONVERSATION](
        state,
        1
      );
      expect(state.records).toEqual({ 2: [] });
    });
  });

  it('lists contact notes newest first, camelized, and adds the first note', () => {
    const state = {
      records: {
        1: [
          { id: 1, created_at: 1 },
          { id: 2, created_at: 2 },
        ],
      },
    };
    expect(contactNotes.getters.getAllNotesByContactId(state)(1)).toEqual([
      { id: 2, createdAt: 2 },
      { id: 1, createdAt: 1 },
    ]);
    expect(contactNotes.getters.getAllNotesByContactId(state)(9)).toEqual([]);
    expect(contactNotes.getters.getAllNotesByContact(state)(9)).toEqual([]);
    contactNotes.mutations[types.ADD_CONTACT_NOTE](state, {
      contactId: 3,
      data: { id: 7 },
    });
    expect(state.records[3]).toEqual([{ id: 7 }]);
  });

  it('removes a typing user from a conversation with no list yet', () => {
    const state = { records: {} };
    conversationTypingStatus.mutations[
      types.REMOVE_USER_TYPING_FROM_CONVERSATION
    ](state, { conversationId: 1, user: { id: 1, type: 'user' } });
    expect(state.records[1]).toEqual([]);
  });

  it('lists conversation and contact custom views', () => {
    const state = {
      conversation: { records: [{ id: 1 }] },
      contact: { records: [{ id: 2 }] },
    };
    expect(customViews.getters.getConversationCustomViews(state)).toEqual([
      { id: 1 },
    ]);
    expect(customViews.getters.getContactCustomViews(state)).toEqual([
      { id: 2 },
    ]);
  });

  it('reads the selected push notification flags', () => {
    expect(
      userNotificationSettings.getters.getSelectedPushFlags({
        record: { selected_push_flags: ['a'] },
      })
    ).toEqual(['a']);
  });

  it('fills missing CSAT rating counts with zero', () => {
    const state = { metrics: {} };
    csat.mutations[types.SET_CSAT_RESPONSE_METRICS](state, {
      ratings_count: { 5: 3 },
    });
    expect(state.metrics).toEqual({
      totalResponseCount: 0,
      ratingsCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 3 },
      totalSentMessagesCount: 0,
    });
  });

  it('accepts a single selected conversation id', () => {
    const state = { selectedConversationIds: [] };
    bulkActions.mutations[types.SET_SELECTED_CONVERSATION_IDS](state, 4);
    expect(state.selectedConversationIds).toEqual([4]);
  });

  it('ignores capacity policy changes for unknown policies, and starts empty user lists', () => {
    const state = {
      records: [{ id: 1, inboxCapacityLimits: [{ id: 3 }] }],
    };
    const { mutations } = agentCapacityPolicies;
    mutations[types.ADD_AGENT_CAPACITY_POLICIES_USERS](state, {
      policyId: 9,
      user: { id: 1 },
    });
    mutations[types.DELETE_AGENT_CAPACITY_POLICIES_USERS](state, {
      policyId: 9,
      userId: 1,
    });
    mutations[types.DELETE_AGENT_CAPACITY_POLICIES_INBOXES](state, {
      policyId: 9,
      limitId: 3,
    });
    expect(state.records[0]).toEqual({
      id: 1,
      inboxCapacityLimits: [{ id: 3 }],
    });

    mutations[types.DELETE_AGENT_CAPACITY_POLICIES_USERS](state, {
      policyId: 1,
      userId: 5,
    });
    expect(state.records[0]).toMatchObject({
      users: [],
      assignedAgentCount: 0,
    });
  });

  it('polls conversation counts less often for bigger accounts', () => {
    expect(getMetaDebounceKey(50)).toBe('default');
    expect(getMetaDebounceKey(500)).toBe('long');
    expect(getMetaDebounceKey(0)).toBe('superLong');
  });

  describe('help center', () => {
    const helpState = key => ({
      [key]: { byId: {}, allIds: [], uiFlags: { byId: {} } },
      uiFlags: {
        isCreating: true,
        isSwitching: false,
        isFetchingSSLStatus: true,
      },
      meta: { count: 2 },
    });

    it('returns default flags and skips missing articles', () => {
      const state = helpState('articles');
      expect(articleGetters.uiFlags(state)(1)).toEqual({
        isFetching: false,
        isUpdating: false,
        isDeleting: false,
      });
      articleMutations[types.ADD_MANY_ARTICLES](state, [
        { id: 1, status: 'draft' },
      ]);
      articleMutations[types.ADD_MANY_ARTICLES_ID](state, [1, 2]);
      articleMutations[types.UPDATE_ARTICLE_FLAG](state, {
        articleId: 1,
        uiFlags: { isUpdating: true },
      });
      articleMutations[types.ADD_ARTICLE_FLAG](state, {
        articleId: 2,
        uiFlags: { isFetching: true },
      });
      expect(articleGetters.uiFlags(state)(1).isUpdating).toBe(true);
      expect(state.articles.uiFlags.byId[2].isFetching).toBe(true);

      const getters = {
        articleById: articleGetters.articleById(state),
      };
      expect(articleGetters.allArticles(state, getters)).toEqual([
        { id: 1, status: 'draft' },
      ]);
      expect(articleGetters.articleStatus(state)(2)).toBeUndefined();
      expect(articleGetters.getMeta(state)).toEqual({ count: 2 });

      articleMutations[types.REMOVE_ARTICLE_ID](state, 2);
      expect(state.articles.allIds).toEqual([1]);
    });

    it('manages categories, their flags and positions', () => {
      const state = helpState('categories');
      expect(categoryGetters.uiFlags(state)(1).isFetching).toBe(false);
      expect(categoryGetters.isCreating(state)).toBe(true);
      categoryMutations[types.ADD_MANY_CATEGORIES](state, [
        { id: 1, position: 2 },
        { id: 2 },
      ]);
      categoryMutations[types.ADD_MANY_CATEGORIES_ID](state, [2, 1, 3, 4]);
      categoryMutations[types.ADD_CATEGORY_FLAG](state, {
        categoryId: 1,
        uiFlags: { isDeleting: true },
      });
      expect(categoryGetters.uiFlags(state)(1).isDeleting).toBe(true);
      expect(categoryGetters.categoryById(state)(3)).toBeUndefined();
      const getters = { categoryById: categoryGetters.categoryById(state) };
      expect(categoryGetters.allCategories(state, getters)).toHaveLength(4);
      expect(categoryGetters.getMeta(state)).toEqual({ count: 2 });

      categoryMutations[types.SET_CATEGORY_POSITIONS](state, { 2: 1 });
      expect(state.categories.allIds).toEqual([2, 1, 3, 4]);

      categoryMutations[types.REMOVE_CATEGORY_ID](state, 3);
      categoryMutations[types.CLEAR_CATEGORIES](state);
      expect(state.categories).toEqual({
        byId: {},
        allIds: [],
        uiFlags: { byId: {} },
      });
    });

    it('manages portals and the portal switcher', () => {
      const state = { ...helpState('portals'), isSwitching: true };
      expect(portalGetters.uiFlagsIn(state)('docs').isUpdating).toBe(false);
      expect(portalGetters.isCreatingPortal(state)).toBe(true);
      expect(portalGetters.isFetchingSSLStatus(state)).toBe(true);
      expect(portalGetters.isSwitching(state)).toBe(true);
      expect(portalGetters.count(state)).toBe(0);

      portalMutations[portalTypes.ADD_MANY_PORTALS_ENTRY](state, [
        { slug: 'docs' },
      ]);
      portalMutations[portalTypes.ADD_MANY_PORTALS_IDS](state, ['docs']);
      portalMutations[portalTypes.SET_PORTAL_SWITCHING_FLAG](state, {
        isSwitching: true,
      });
      expect(state.portals.byId.docs).toEqual({ slug: 'docs' });
      expect(portalGetters.count(state)).toBe(1);
      expect(portalGetters.isSwitchingPortal(state)).toBe(true);
    });
  });

  describe('notifications', () => {
    const state = () => ({
      records: {
        1: { id: 1, created_at: 1, primary_actor_id: 10, read_at: null },
        2: { id: 2, created_at: 2, primary_actor_id: 20 },
      },
      meta: { unreadCount: 3 },
      notificationFilters: { status: 'read' },
    });

    it('lists notifications camelized in either order', () => {
      const s = state();
      expect(
        notificationGetters
          .getFilteredNotificationsV4(s)({ sortOrder: 'desc' })
          .map(n => n.primaryActorId)
      ).toEqual([20, 10]);
      expect(
        notificationGetters
          .getFilteredNotificationsV4(s)({ sortOrder: 'asc' })
          .map(n => n.id)
      ).toEqual([1, 2]);
      expect(
        notificationGetters
          .getFilteredNotifications(s)({ sortOrder: 'desc' })
          .map(n => n.id)
      ).toEqual([2, 1]);
      expect(
        notificationGetters
          .getFilteredNotifications(s)({ sortOrder: 'asc' })
          .map(n => n.id)
      ).toEqual([1, 2]);
      expect(notificationGetters.getUnreadCount(s)).toBe(3);
      expect(notificationSort({}, {}, 'unknown')).toBe(0);
    });

    it('replaces a notification repeated for the same actor', () => {
      const s = state();
      notificationMutations[types.SET_NOTIFICATIONS](s, [
        { id: 3, primary_actor_id: 10 },
      ]);
      expect(Object.keys(s.records)).toEqual(['2', '3']);
    });

    it('updates a notification with new counts, snoozes and filters', () => {
      const s = state();
      notificationMutations[types.UPDATE_NOTIFICATION](s, {
        notification: { id: 1, read_at: 5 },
        unread_count: 1,
        count: 9,
      });
      notificationMutations[types.UPDATE_NOTIFICATION](s, {
        notification: { id: 4 },
        unread_count: 1,
        count: 10,
      });
      expect(s.records[1].read_at).toBe(5);
      expect(s.records[4]).toEqual({ id: 4 });
      expect(s.meta).toEqual({ unreadCount: 1, count: 10 });

      notificationMutations[types.SNOOZE_NOTIFICATION](s, {
        id: 1,
        snoozed_until: 'tomorrow',
      });
      expect(s.records[1].snoozed_until).toBe('tomorrow');

      notificationMutations[types.SET_NOTIFICATION_FILTERS](s, { type: 'all' });
      notificationMutations[types.UPDATE_NOTIFICATION_FILTERS](s, {
        sortOrder: 'asc',
      });
      expect(s.notificationFilters).toEqual({ type: 'all', sortOrder: 'asc' });
    });
  });
});
