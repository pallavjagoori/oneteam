import AgentBotsAPI from 'dashboard/api/agentBots';
import InboxesAPI from 'dashboard/api/inboxes';
import agentBots from '../../agentBots';
import { apiError, buildStore } from '../../../specs/oneteamStore';

/*
 * OneTeam coverage for the agent bots Vuex module, run as a real store:
 * the inbox-to-bot link, avatar handling, token/secret resets and the
 * error paths of every action.
 */
const { mockApi } = vi.hoisted(() => ({
  mockApi: methods => ({
    default: Object.fromEntries(methods.map(name => [name, vi.fn()])),
  }),
}));
vi.mock('dashboard/api/agentBots', () =>
  mockApi([
    'get',
    'create',
    'update',
    'delete',
    'show',
    'deleteAgentBotAvatar',
    'resetAccessToken',
    'resetSecret',
  ])
);
vi.mock('dashboard/api/inboxes', () => mockApi(['getAgentBot', 'setAgentBot']));

describe('agentBots store (OneTeam)', () => {
  let store;
  const flags = () => store.getters['agentBots/getUIFlags'];

  beforeEach(() => {
    store = buildStore({ agentBots });
    store.commit('agentBots/SET_AGENT_BOTS', [
      { id: 1, name: 'Bot', thumbnail: 'a.png' },
    ]);
  });

  afterEach(() => vi.clearAllMocks());

  it('finds the bot connected to an inbox', async () => {
    InboxesAPI.getAgentBot.mockResolvedValueOnce({
      data: { agent_bot: { id: 1 } },
    });
    await store.dispatch('agentBots/fetchAgentBotInbox', '5');
    expect(store.getters['agentBots/getActiveAgentBot'](5).name).toBe('Bot');

    InboxesAPI.getAgentBot.mockResolvedValueOnce({ data: null });
    await store.dispatch('agentBots/fetchAgentBotInbox', 6);
    expect(store.getters['agentBots/getActiveAgentBot'](6)).toEqual({});
  });

  it('sends the avatar with a new or updated bot when one is chosen', async () => {
    const avatar = new Blob(['x']);
    AgentBotsAPI.create.mockResolvedValue({ data: { id: 2 } });
    await store.dispatch('agentBots/create', {
      name: 'New',
      outgoing_url: 'https://bot',
      avatar,
    });
    const created = AgentBotsAPI.create.mock.calls[0][0];
    expect(created.get('bot_type')).toBe('webhook');
    expect(created.get('avatar')).toBeInstanceOf(Blob);

    AgentBotsAPI.update.mockResolvedValue({ data: { id: 1, name: 'Up' } });
    await store.dispatch('agentBots/update', {
      id: 1,
      data: { name: 'Up', bot_type: 'csml', avatar },
    });
    const updated = AgentBotsAPI.update.mock.calls[0][1];
    expect(updated.get('bot_type')).toBe('csml');
    expect(updated.get('avatar')).toBeInstanceOf(Blob);
  });

  it('removes the avatar thumbnail of a known bot only', async () => {
    AgentBotsAPI.deleteAgentBotAvatar.mockResolvedValue({});
    await store.dispatch('agentBots/deleteAgentBotAvatar', 1);
    expect(store.getters['agentBots/getBot'](1).thumbnail).toBe('');
    await store.dispatch('agentBots/deleteAgentBotAvatar', 9);
    expect(flags().isUpdatingAvatar).toBe(false);
  });

  it('loads a single bot', async () => {
    AgentBotsAPI.show.mockResolvedValue({ data: { id: 3, name: 'Three' } });
    await store.dispatch('agentBots/show', 3);
    expect(store.getters['agentBots/getBot'](3).name).toBe('Three');
  });

  it('keeps an empty thumbnail when none is given', () => {
    store.commit('agentBots/UPDATE_AGENT_BOT_AVATAR', { id: 1 });
    expect(store.getters['agentBots/getBot'](1).thumbnail).toBe('');
  });

  it.each(['resetAccessToken', 'resetSecret'])(
    '%s stores and returns the updated bot',
    async action => {
      AgentBotsAPI[action].mockResolvedValue({ data: { id: 1, name: 'New' } });
      await expect(store.dispatch(`agentBots/${action}`, 1)).resolves.toEqual({
        id: 1,
        name: 'New',
      });
      expect(store.getters['agentBots/getBot'](1).name).toBe('New');
    }
  );

  it.each([
    ['create', AgentBotsAPI, 'create', {}, 'isCreating'],
    ['update', AgentBotsAPI, 'update', { id: 1, data: {} }, 'isUpdating'],
    ['delete', AgentBotsAPI, 'delete', 1, 'isDeleting'],
    [
      'deleteAgentBotAvatar',
      AgentBotsAPI,
      'deleteAgentBotAvatar',
      1,
      'isUpdatingAvatar',
    ],
    ['show', AgentBotsAPI, 'show', 1, 'isFetchingItem'],
    ['fetchAgentBotInbox', InboxesAPI, 'getAgentBot', 1, 'isFetchingAgentBot'],
    [
      'setAgentBotInbox',
      InboxesAPI,
      'setAgentBot',
      { inboxId: 1, botId: 1 },
      'isSettingAgentBot',
    ],
    [
      'disconnectBot',
      InboxesAPI,
      'setAgentBot',
      { inboxId: 1 },
      'isDisconnecting',
    ],
    ['resetAccessToken', AgentBotsAPI, 'resetAccessToken', 1, null],
    ['resetSecret', AgentBotsAPI, 'resetSecret', 1, null],
  ])('%s reports a failure', async (action, api, method, payload, flag) => {
    api[method].mockRejectedValue(apiError('Bot error'));
    await expect(
      store.dispatch(`agentBots/${action}`, payload)
    ).rejects.toThrow('Bot error');
    if (flag) expect(flags()[flag]).toBe(false);
  });
});
