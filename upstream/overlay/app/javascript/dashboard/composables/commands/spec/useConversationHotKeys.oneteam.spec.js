import { emitter } from 'shared/helpers/mitt';
import { CMD_AI_ASSIST } from 'dashboard/helper/commandbar/events';
import { useConversationHotKeys } from '../useConversationHotKeys';

/*
 * OneTeam coverage for the conversation command bar: the actions offered
 * for resolved and snoozed chats, the "None" team when a team is set, the
 * AI options for drafts and private notes, the snooze-only menu from the
 * list's context menu, and what each action's handler does.
 */
const ctx = vi.hoisted(() => ({
  getters: {},
  route: {},
  dispatch: vi.fn(),
  addLabel: vi.fn(),
  removeLabel: vi.fn(),
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('vue-router', () => ({ useRoute: () => ctx.route }));
vi.mock('shared/helpers/mitt', () => ({ emitter: { emit: vi.fn() } }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: ctx.dispatch }),
  useMapGetter: key => ({
    get value() {
      return ctx.getters[key];
    },
  }),
}));
vi.mock('dashboard/composables/useConversationLabels', () => ({
  useConversationLabels: () => ({
    activeLabels: { value: [{ title: 'vip' }] },
    inactiveLabels: { value: [{ title: 'new' }] },
    addLabelToConversation: ctx.addLabel,
    removeLabelFromConversation: ctx.removeLabel,
  }),
}));
vi.mock('dashboard/composables/useCaptain', () => ({
  useCaptain: () => ({ captainTasksEnabled: { value: true } }),
}));
vi.mock('dashboard/composables/useAgentsList', () => ({
  useAgentsList: () => ({ agentsList: { value: [{ id: 4, name: 'Ana' }] } }),
}));

const find = (keys, id) => keys.find(action => action.id === id);

describe('useConversationHotKeys (OneTeam)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctx.route = { name: 'inbox_conversation' };
    ctx.getters = {
      getSelectedChat: {
        id: 7,
        status: 'resolved',
        muted: true,
        priority: 'low',
        meta: { team: { id: 1 } },
      },
      'draftMessages/getReplyEditorMode': 'NOTE',
      getContextMenuChatId: null,
      'teams/getTeams': [{ id: 1, name: 'Sales' }],
      'draftMessages/get': () => '',
    };
  });

  it('offers reopen, unmute and a "None" team for a resolved chat', () => {
    const keys = useConversationHotKeys().conversationHotKeys.value;
    expect(find(keys, 'reopen_conversation')).toBeDefined();
    expect(find(keys, 'unmute_conversation')).toBeDefined();
    expect(find(keys, 'team-0').title).toBe('TEAMS_SETTINGS.LIST.NONE');
    expect(find(keys, 'priority-low')).toBeUndefined();
  });

  it('offers reopen for a snoozed chat and nothing for an unknown status', () => {
    ctx.getters.getSelectedChat.status = 'snoozed';
    let keys = useConversationHotKeys().conversationHotKeys.value;
    expect(find(keys, 'reopen_conversation')).toBeDefined();
    ctx.getters.getSelectedChat.status = 'pending';
    keys = useConversationHotKeys().conversationHotKeys.value;
    expect(find(keys, 'reopen_conversation')).toBeUndefined();
  });

  it('runs the assign, priority, team and label actions', () => {
    const keys = useConversationHotKeys().conversationHotKeys.value;
    const run = id => {
      const action = find(keys, id);
      action.handler(action);
    };
    run('agent-4');
    run('priority-urgent');
    run('team-1');
    run('new');
    run('vip');
    expect(ctx.dispatch).toHaveBeenCalledWith('assignAgent', {
      conversationId: 7,
      agentId: 4,
    });
    expect(ctx.dispatch).toHaveBeenCalledWith('assignPriority', {
      conversationId: 7,
      priority: 'urgent',
    });
    expect(ctx.dispatch).toHaveBeenCalledWith('assignTeam', {
      conversationId: 7,
      teamId: 1,
    });
    expect(ctx.addLabel).toHaveBeenCalledWith({ title: 'new' });
    expect(ctx.removeLabel).toHaveBeenCalledWith('vip');
  });

  it('offers a summary for private notes and rewrites for drafts', () => {
    let keys = useConversationHotKeys().conversationHotKeys.value;
    find(keys, 'ai-assist-summarize').handler();
    expect(emitter.emit).toHaveBeenCalledWith(CMD_AI_ASSIST, 'summarize');

    ctx.getters['draftMessages/get'] = key =>
      key === 'draft-7-NOTE' ? 'Hello' : '';
    keys = useConversationHotKeys().conversationHotKeys.value;
    expect(find(keys, 'ai-assist-confident')).toBeDefined();
  });

  it('shows only snooze options from the list context menu', () => {
    ctx.route = { name: 'home' };
    ctx.getters.getContextMenuChatId = 7;
    const keys = useConversationHotKeys().conversationHotKeys.value;
    const [menu, ...options] = keys;
    expect(menu.id).toBe('snooze_conversation');
    expect(options.every(action => action.parent === menu.id)).toBe(true);
  });

  it('shows nothing outside conversation routes', () => {
    ctx.route = { name: 'settings_home' };
    expect(useConversationHotKeys().conversationHotKeys.value).toEqual([]);
  });
});
