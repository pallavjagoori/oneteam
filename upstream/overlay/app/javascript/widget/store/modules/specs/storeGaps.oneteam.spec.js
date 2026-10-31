/**
 * OneTeam spec for widget store paths the upstream specs leave out: the app
 * config mutation, contact and label actions, metadata that waits for the
 * conversation to exist, and ignored API failures.
 */
// Load the store first: campaign.js reaches it through the campaign timer,
// and loading a module before the store would leave that module undefined
// inside the store's own imports.
import 'widget/store';
import * as appConfig from '../appConfig';
import * as contacts from '../contacts';
import conversationLabels from '../conversationLabels';
import events from '../events';
import { getters as agentGetters } from '../agent';
import {
  getters as campaignGetters,
  actions as campaignActions,
  mutations as campaignMutations,
} from '../campaign';
import { actions as conversationActions } from '../conversation/actions';
import { mutations as conversationMutations } from '../conversation/mutations';
import { getters as conversationGetters } from '../conversation/getters';
import ContactsAPI from '../../../api/contacts';
import LabelsAPI from '../../../api/conversationLabels';
import EventsAPI from '../../../api/events';
import * as conversationAPI from '../../../api/conversation';
import { sendMessage } from 'widget/helpers/utils';
import { SET_USER_ERROR } from '../../../constants/errorTypes';
import { SET_WIDGET_APP_CONFIG, TOGGLE_WIDGET_OPEN } from '../../types';

vi.mock('../../../api/contacts');
vi.mock('../../../api/conversationLabels');
vi.mock('../../../api/events');
vi.mock('../../../api/conversation');
vi.mock('widget/helpers/utils', async importOriginal => ({
  ...(await importOriginal()),
  sendMessage: vi.fn(),
}));

const commit = vi.fn();
const dispatch = vi.fn();
const withConversation = {
  'conversationAttributes/getConversationParams': { id: 3 },
};
const withoutConversation = {
  'conversationAttributes/getConversationParams': {},
};

describe('appConfig', () => {
  it('applies the widget settings, keeping the locale when none is given', () => {
    const state = { locale: 'en' };
    const config = {
      showPopoutButton: true,
      position: 'left',
      hideMessageBubble: true,
      widgetStyle: 'flat',
      darkMode: 'auto',
      showUnreadMessagesDialog: false,
      welcomeTitle: 'Hi',
      welcomeDescription: 'Ask us',
      availableMessage: 'Online',
      unavailableMessage: 'Away',
      enableFileUpload: false,
      enableEmojiPicker: false,
      enableEndConversation: false,
    };
    appConfig.mutations[SET_WIDGET_APP_CONFIG](state, config);
    expect(state).toEqual({ ...config, locale: 'en' });
    appConfig.mutations[SET_WIDGET_APP_CONFIG](state, { locale: 'fr' });
    expect(state.locale).toBe('fr');
  });

  it('normalizes the settings in setAppConfig', () => {
    appConfig.actions.setAppConfig({ commit }, {});
    expect(commit).toHaveBeenCalledWith(SET_WIDGET_APP_CONFIG, {
      hideMessageBubble: false,
      position: 'right',
      showPopoutButton: false,
      showUnreadMessagesDialog: false,
      widgetStyle: 'rounded',
      darkMode: 'light',
      welcomeTitle: '',
      welcomeDescription: '',
      availableMessage: '',
      unavailableMessage: '',
      enableFileUpload: undefined,
      enableEmojiPicker: true,
      enableEndConversation: true,
    });
  });

  it('opens the widget and reads the config getters', () => {
    appConfig.actions.toggleWidgetOpen({ commit }, true);
    expect(commit).toHaveBeenCalledWith(TOGGLE_WIDGET_OPEN, true);
    const state = { isWidgetOpen: false };
    appConfig.mutations[TOGGLE_WIDGET_OPEN](state, true);
    expect(state.isWidgetOpen).toBe(true);
    const config = {
      position: 'right',
      hideMessageBubble: true,
      isWidgetOpen: true,
      widgetColor: '#123',
      referrerHost: 'shop.test',
      widgetStyle: 'flat',
      darkMode: 'dark',
    };
    const { getters } = appConfig;
    expect(getters.getAppConfig(config)).toBe(config);
    expect(getters.isRightAligned(config)).toBe(true);
    expect(getters.getHideMessageBubble(config)).toBe(true);
    expect(getters.getIsWidgetOpen(config)).toBe(true);
    expect(getters.getWidgetColor(config)).toBe('#123');
    expect(getters.getReferrerHost(config)).toBe('shop.test');
    expect(getters.isWidgetStyleFlat(config)).toBe(true);
    expect(getters.darkMode(config)).toBe('dark');
  });
});

describe('contacts', () => {
  it('loads the current contact and ignores a failed load', async () => {
    ContactsAPI.get.mockResolvedValue({ data: { id: 1 } });
    await contacts.actions.get({ commit });
    expect(commit).toHaveBeenCalledWith('SET_CURRENT_USER', { id: 1 });
    ContactsAPI.get.mockRejectedValue(new Error('offline'));
    await expect(contacts.actions.get({ commit })).resolves.toBeUndefined();
  });

  it('reports a failed setUser to the host page with the API body', async () => {
    ContactsAPI.setUser.mockRejectedValue({
      response: { data: { message: 'Invalid hash' } },
    });
    await contacts.actions.setUser(
      { dispatch },
      { identifier: 'u', user: { email: 'a@b.test' } }
    );
    expect(sendMessage).toHaveBeenCalledWith({
      event: 'error',
      errorType: SET_USER_ERROR,
      data: { message: 'Invalid hash' },
    });
    const plain = new Error('offline');
    ContactsAPI.setUser.mockRejectedValue(plain);
    await contacts.actions.setUser({ dispatch }, { identifier: 'u', user: {} });
    expect(sendMessage).toHaveBeenLastCalledWith({
      event: 'error',
      errorType: SET_USER_ERROR,
      data: plain,
    });
  });

  it('ignores failed custom attribute updates', async () => {
    ContactsAPI.setCustomAttributes.mockRejectedValue(new Error('x'));
    ContactsAPI.deleteCustomAttribute.mockRejectedValue(new Error('x'));
    await expect(
      contacts.actions.setCustomAttributes({}, { plan: 'pro' })
    ).resolves.toBeUndefined();
    await expect(
      contacts.actions.setCustomAttributes({})
    ).resolves.toBeUndefined();
    await expect(
      contacts.actions.deleteCustomAttribute({}, 'plan')
    ).resolves.toBeUndefined();
  });
});

describe('conversation labels', () => {
  const { actions } = conversationLabels;

  it('keeps labels pending until the conversation exists', async () => {
    await actions.create({ commit, rootGetters: withoutConversation }, 'vip');
    expect(commit).toHaveBeenCalledWith(
      'conversation/setPendingLabels',
      'vip',
      {
        root: true,
      }
    );
    await actions.destroy({ commit, rootGetters: {} }, 'vip');
    expect(commit).toHaveBeenCalledWith(
      'conversation/removePendingLabel',
      'vip',
      { root: true }
    );
    expect(LabelsAPI.create).not.toHaveBeenCalled();
  });

  it('calls the API once the conversation exists, ignoring failures', async () => {
    await actions.create({ commit, rootGetters: withConversation }, 'vip');
    expect(LabelsAPI.create).toHaveBeenCalledWith('vip');
    await actions.destroy({ commit, rootGetters: withConversation }, 'vip');
    expect(LabelsAPI.destroy).toHaveBeenCalledWith('vip');
    LabelsAPI.create.mockRejectedValue(new Error('x'));
    LabelsAPI.destroy.mockRejectedValue(new Error('x'));
    await actions.create({ commit, rootGetters: withConversation }, 'a');
    await actions.destroy({ commit, rootGetters: withConversation }, 'a');
  });
});

describe('conversation custom attributes', () => {
  it('keeps attributes pending until the conversation exists', async () => {
    await conversationActions.setCustomAttributes(
      { commit, rootGetters: withoutConversation },
      { plan: 'pro' }
    );
    expect(commit).toHaveBeenCalledWith('setPendingCustomAttributes', {
      plan: 'pro',
    });
    await conversationActions.deleteCustomAttribute(
      { commit, rootGetters: withoutConversation },
      'plan'
    );
    expect(commit).toHaveBeenCalledWith('removePendingCustomAttribute', 'plan');
  });

  it('calls the API once the conversation exists, ignoring failures', async () => {
    await conversationActions.setCustomAttributes(
      { commit, rootGetters: withConversation },
      { plan: 'pro' }
    );
    expect(conversationAPI.setCustomAttributes).toHaveBeenCalledWith({
      plan: 'pro',
    });
    await conversationActions.setCustomAttributes({
      commit,
      rootGetters: withConversation,
    });
    conversationAPI.setCustomAttributes.mockRejectedValue(new Error('x'));
    conversationAPI.deleteCustomAttribute.mockRejectedValue(new Error('x'));
    await conversationActions.setCustomAttributes(
      { commit, rootGetters: withConversation },
      { plan: 'pro' }
    );
    await conversationActions.deleteCustomAttribute(
      { commit, rootGetters: withConversation },
      'plan'
    );
    expect(conversationAPI.deleteCustomAttribute).toHaveBeenCalledWith('plan');
  });

  it('has no earliest message in an empty conversation', () => {
    expect(
      conversationGetters.getEarliestMessage({ conversations: {} })
    ).toEqual({});
  });

  it('exposes the pending metadata', () => {
    const state = { pendingCustomAttributes: { a: 1 }, pendingLabels: ['b'] };
    expect(conversationGetters.getPendingCustomAttributes(state)).toEqual({
      a: 1,
    });
    expect(conversationGetters.getPendingLabels(state)).toEqual(['b']);
  });
});

describe('conversation messages', () => {
  const state = () => ({
    conversations: {
      1: { id: 1, content: 'a', content_attributes: { x: 1 } },
      2: { id: 2, content: 'b', meta: { retries: 1 } },
    },
    meta: {},
    conversation: {},
  });

  it('stores missing messages and merges content attributes', () => {
    const s = state();
    conversationMutations.setMissingMessagesInConversation(s, { 3: {} });
    expect(s.conversation).toEqual({ 3: {} });
    conversationMutations.updateMessage(s, {
      id: 1,
      content_attributes: { y: 2 },
    });
    expect(s.conversations[1].content_attributes).toEqual({ x: 1, y: 2 });
    conversationMutations.updateMessage(s, {
      id: 2,
      content_attributes: { y: 2 },
    });
    expect(s.conversations[2].content_attributes).toEqual({ y: 2 });
  });

  it('merges message meta, ignoring unknown messages', () => {
    const s = state();
    conversationMutations.updateMessageMeta(s, { id: 2, meta: { error: 'x' } });
    expect(s.conversations[2].meta).toEqual({ retries: 1, error: 'x' });
    conversationMutations.updateMessageMeta(s, { id: 1, meta: { error: '' } });
    expect(s.conversations[1].meta).toEqual({ error: '' });
    conversationMutations.updateMessageMeta(s, { id: 9, meta: {} });
    expect(s.conversations[9]).toBeUndefined();
  });

  it('records the last seen time and the last message id', async () => {
    const s = state();
    conversationMutations.setMetaUserLastSeenAt(s, 100);
    expect(s.meta.userLastSeenAt).toBe(100);
    conversationMutations.setLastMessageId(s);
    expect(s.lastMessageId).toBe(2);
    const empty = { conversations: {} };
    conversationMutations.setLastMessageId(empty);
    expect(empty.lastMessageId).toBeUndefined();
    await conversationActions.setLastMessageId({ commit });
    expect(commit).toHaveBeenCalledWith('setLastMessageId');
  });
});

describe('small modules', () => {
  it('ignores a failed custom event', async () => {
    EventsAPI.create.mockRejectedValue(new Error('x'));
    await expect(
      events.actions.create({}, { name: 'checkout' })
    ).resolves.toBeUndefined();
  });

  it('reads the agent and campaign flags', () => {
    expect(agentGetters.getHasFetched({ uiFlags: { hasFetched: true } })).toBe(
      true
    );
    expect(campaignGetters.getUIFlags({ uiFlags: { isError: true } })).toEqual({
      isError: true,
    });
    expect(campaignGetters.getCampaigns({ records: [{ id: 2 }] })).toEqual([
      { id: 2 },
    ]);
    expect(
      campaignGetters.getActiveCampaign({ activeCampaign: { id: 1 } })
    ).toEqual({
      id: 1,
    });
    const state = { uiFlags: { hasFetched: false } };
    campaignMutations.setHasFetched(state, true);
    expect(state.uiFlags.hasFetched).toBe(true);
  });

  it('flags an error when resetting the campaign fails', async () => {
    const failingCommit = vi.fn(type => {
      if (type === 'setCampaignExecuted') throw new Error('x');
    });
    await campaignActions.resetCampaign({ commit: failingCommit });
    expect(failingCommit).toHaveBeenLastCalledWith('setError', true);
  });
});
