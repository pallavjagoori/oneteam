/**
 * OneTeam behaviour spec for the conversation card context menu.
 *
 * The store, admin check and clipboard are faked. Covers read and
 * unread actions, status options for each status, snoozing through the
 * command bar, priority, label search and toggling, agent and team
 * assignment, opening or copying the link, deleting as admin, and
 * limiting the menu with allowed options.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import ContextMenu from '../Index.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: env.isAdmin }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: vi.fn() }));
vi.mock('dashboard/helper/agentHelper.js', () => ({
  getAgentsByUpdatedPresence: agents => agents,
  getSortedAgentsByAvailability: agents => agents,
}));

const MenuItem = {
  name: 'MenuItem',
  props: ['option', 'variant'],
  emits: ['click', 'mousedown'],
  template:
    '<button class="item" @click="$emit(`click`, $event)" @mousedown="$emit(`mousedown`, $event)">{{ option.label }}</button>',
};
const Submenu = {
  name: 'MenuItemWithSubmenu',
  props: ['option', 'subMenuAvailable'],
  template:
    '<div class="sub"><span class="title">{{ option.label }}</span><slot /></div>',
};
const SearchInput = {
  name: 'NextInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="search"><slot name="prefix" /></div>',
};

const labels = [
  { id: 1, title: 'billing', color: '#f00' },
  { id: 2, title: 'sales', color: '#0f0' },
];

const mountMenu = (props = {}) =>
  mount(ContextMenu, {
    props: { chatId: 9, inboxId: 4, status: 'open', ...props },
    global: {
      mocks: { $store: env.store },
      stubs: {
        MenuItem,
        MenuItemWithSubmenu: Submenu,
        NextInput: SearchInput,
        AgentLoadingPlaceholder: { template: '<i class="loading-agents" />' },
        Icon: true,
      },
    },
  });

const item = (wrapper, label) =>
  wrapper.findAll('.item').find(button => button.text() === label);
const labelsOf = (wrapper, title) =>
  wrapper
    .findAllComponents(Submenu)
    .find(sub => sub.props('option').label === title)
    .findAllComponents(MenuItem);

describe('Conversation context menu behaviour', () => {
  beforeEach(() => {
    env.isAdmin = ref(true);
    env.agentFlags = { isFetching: false };
    env.store = {
      dispatch: vi.fn().mockResolvedValue(),
      getters: {
        'labels/getLabels': labels,
        'teams/getTeams': [{ id: 3, name: 'Support' }],
        'inboxAssignableAgents/getUIFlags': env.agentFlags,
        'inboxAssignableAgents/getAssignableAgents': () => [
          {
            id: 7,
            name: 'Ana',
            thumbnail: 'a.png',
            availability_status: 'online',
          },
        ],
        getCurrentUser: { id: 1 },
        getCurrentAccountId: 1,
      },
    };
    window.chatwootConfig = { hostURL: 'https://app.test' };
  });

  it('fetches agents and shows every section for admins', () => {
    const wrapper = mountMenu();
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'inboxAssignableAgents/fetch',
      [4]
    );
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_UNREAD').exists()
    ).toBe(true);
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.REOPEN')
    ).toBeUndefined();
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.SNOOZE.TITLE').exists()
    ).toBe(true);
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.DELETE').exists()
    ).toBe(true);
    const agentOptions = labelsOf(
      wrapper,
      'CONVERSATION.CARD_CONTEXT_MENU.ASSIGN_AGENT'
    );
    expect(agentOptions.map(a => a.props('option'))).toEqual([
      { key: null, thumbnail: undefined, status: undefined, label: 'None' },
      { key: 7, thumbnail: 'a.png', status: 'online', label: 'Ana' },
    ]);
  });

  it('marks read or unread and changes status', async () => {
    let wrapper = mountMenu();
    await item(
      wrapper,
      'CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_UNREAD'
    ).trigger('click');
    await item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.RESOLVED').trigger(
      'click'
    );
    expect(wrapper.emitted('markAsUnread')).toHaveLength(1);
    expect(wrapper.emitted('updateConversation')).toEqual([['resolved', null]]);

    wrapper = mountMenu({ hasUnreadMessages: true, status: 'resolved' });
    await item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_READ').trigger(
      'click'
    );
    expect(wrapper.emitted('markAsRead')).toHaveLength(1);
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.REOPEN').exists()
    ).toBe(true);
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.SNOOZE.TITLE')
    ).toBeUndefined();
  });

  it('snoozes through the command bar', async () => {
    const ninja = document.createElement('ninja-keys');
    ninja.open = vi.fn();
    document.body.appendChild(ninja);
    const wrapper = mountMenu();
    await item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.SNOOZE.TITLE').trigger(
      'click'
    );
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('setContextMenuChatId', 9);
    expect(ninja.open).toHaveBeenCalledWith({ parent: 'snooze_conversation' });
    ninja.remove();
  });

  it('assigns priority without offering the current one', async () => {
    const wrapper = mountMenu({ priority: 'high' });
    const options = labelsOf(wrapper, 'CONVERSATION.PRIORITY.TITLE');
    expect(options.map(o => o.props('option').key)).toEqual([
      null,
      'urgent',
      'medium',
      'low',
    ]);
    await options[1].trigger('click');
    expect(wrapper.emitted('assignPriority')).toEqual([['urgent']]);
  });

  it('lists assigned labels first, searches and toggles them', async () => {
    const wrapper = mountMenu({ conversationLabels: ['sales'] });
    const title = 'CONVERSATION.CARD_CONTEXT_MENU.ASSIGN_LABEL';
    let options = labelsOf(wrapper, title);
    expect(options.map(o => [o.props('option'), o.props('variant')])).toEqual([
      [{ key: 2, color: '#0f0', label: 'sales' }, 'label-assigned'],
      [{ key: 1, color: '#f00', label: 'billing' }, 'label'],
    ]);
    await options[0].trigger('mousedown');
    await options[0].trigger('click');
    await options[1].trigger('click');
    expect(wrapper.emitted('removeLabel')[0][0].title).toBe('sales');
    expect(wrapper.emitted('assignLabel')[0][0].title).toBe('billing');

    const search = wrapper.findComponent(SearchInput);
    await search.trigger('click');
    await search.trigger('keydown', { key: 'a' });
    await search.vm.$emit('update:modelValue', 'bill');
    options = labelsOf(wrapper, title);
    expect(options.map(o => o.props('option').label)).toEqual(['billing']);
    await search.vm.$emit('update:modelValue', 'zzz');
    expect(wrapper.text()).toContain(
      'CONVERSATION.CARD_CONTEXT_MENU.NO_LABELS_FOUND'
    );
  });

  it('assigns agents and teams and shows agent loading', async () => {
    let wrapper = mountMenu();
    await labelsOf(
      wrapper,
      'CONVERSATION.CARD_CONTEXT_MENU.ASSIGN_AGENT'
    )[1].trigger('click');
    expect(wrapper.emitted('assignAgent')[0][0].id).toBe(7);
    const team = labelsOf(
      wrapper,
      'CONVERSATION.CARD_CONTEXT_MENU.ASSIGN_TEAM'
    )[0];
    expect(team.props('option')).toEqual({ key: 3, label: 'Support' });
    await team.trigger('click');
    expect(wrapper.emitted('assignTeam')[0][0].id).toBe(3);

    env.agentFlags.isFetching = true;
    wrapper = mountMenu();
    expect(wrapper.find('.loading-agents').exists()).toBe(true);
  });

  it('opens and copies the link only when there is one', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    let wrapper = mountMenu();
    await item(
      wrapper,
      'CONVERSATION.CARD_CONTEXT_MENU.OPEN_IN_NEW_TAB'
    ).trigger('click');
    await item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.COPY_LINK').trigger(
      'click'
    );
    expect(open).not.toHaveBeenCalled();
    expect(copyTextToClipboard).not.toHaveBeenCalled();

    wrapper = mountMenu({ conversationUrl: '/app/c/9' });
    await item(
      wrapper,
      'CONVERSATION.CARD_CONTEXT_MENU.OPEN_IN_NEW_TAB'
    ).trigger('click');
    expect(open).toHaveBeenCalledWith(
      'https://app.test/app/c/9',
      '_blank',
      'noopener,noreferrer'
    );
    await item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.COPY_LINK').trigger(
      'click'
    );
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith(
      'https://app.test/app/c/9'
    );
    expect(useAlert).toHaveBeenCalledWith(
      'CONVERSATION.CARD_CONTEXT_MENU.COPY_LINK_SUCCESS'
    );
    expect(wrapper.emitted('close')).toHaveLength(2);

    copyTextToClipboard.mockRejectedValueOnce(new Error('denied'));
    await item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.COPY_LINK').trigger(
      'click'
    );
    await flushPromises();
    expect(wrapper.emitted('close')).toHaveLength(2);
    open.mockRestore();
  });

  it('deletes for admins only', async () => {
    let wrapper = mountMenu();
    await item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.DELETE').trigger(
      'click'
    );
    expect(wrapper.emitted('deleteConversation')).toEqual([[9]]);
    env.isAdmin.value = false;
    wrapper = mountMenu();
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.DELETE')
    ).toBeUndefined();
  });

  it('limits the menu to allowed options', () => {
    let wrapper = mountMenu({ allowedOptions: ['snooze', 'copy-link'] });
    expect(wrapper.findAll('.item').map(b => b.text())).toEqual([
      'CONVERSATION.CARD_CONTEXT_MENU.SNOOZE.TITLE',
      'CONVERSATION.CARD_CONTEXT_MENU.COPY_LINK',
    ]);
    expect(wrapper.findComponent(Submenu).exists()).toBe(false);
    wrapper = mountMenu({ allowedOptions: ['status', 'team', 'open-new-tab'] });
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.SNOOZE.TITLE')
    ).toBeUndefined();
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.RESOLVED').exists()
    ).toBe(true);
    expect(wrapper.findAllComponents(Submenu)).toHaveLength(1);
    expect(
      item(wrapper, 'CONVERSATION.CARD_CONTEXT_MENU.COPY_LINK')
    ).toBeUndefined();
    wrapper = mountMenu({ allowedOptions: ['label', 'delete'] });
    expect(
      wrapper.findAllComponents(Submenu).map(s => s.props('option').key)
    ).toEqual(['label']);
    expect(wrapper.findAll('.item').map(b => b.text())).toEqual([
      'billing',
      'sales',
      'CONVERSATION.CARD_CONTEXT_MENU.DELETE',
    ]);
  });
});
