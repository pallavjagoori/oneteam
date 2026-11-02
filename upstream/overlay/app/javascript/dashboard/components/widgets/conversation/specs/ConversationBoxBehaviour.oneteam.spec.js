/**
 * OneTeam behaviour spec for the conversation pane (header, messages and
 * dashboard app tabs).
 *
 * Covers the empty state (and none in the inbox view), loading the
 * conversation's labels and assignable agents, the header's back button
 * and border, dashboard app tabs and frames, switching tabs, and
 * returning to the messages tab and refetching when another conversation
 * opens. Also checks the `showContactPanel` computed, which the template
 * no longer uses.
 */
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import ConversationBox from '../ConversationBox.vue';

const ConversationHeader = {
  name: 'ConversationHeader',
  props: ['chat', 'showBackButton'],
  template: '<header />',
};
const MessagesView = {
  name: 'MessagesView',
  props: ['inboxId', 'isInboxView'],
  template: '<div class="messages" />',
};
const EmptyState = {
  name: 'EmptyState',
  props: ['isOnExpandedLayout'],
  template: '<div class="empty" />',
};
const Frame = {
  name: 'DashboardAppFrame',
  props: ['isVisible', 'config', 'position', 'currentChat'],
  template: '<div class="frame" />',
};
const WootTabs = {
  name: 'WootTabs',
  props: ['index'],
  emits: ['change'],
  template: '<nav><slot /></nav>',
};
const WootTabsItem = {
  name: 'WootTabsItem',
  props: ['index', 'name'],
  template: '<span class="tab">{{ name }}</span>',
};

const mountBox = (getters, props = {}) => {
  const dispatch = vi.fn();
  const wrapper = mount(ConversationBox, {
    props,
    slots: { default: '<p class="extra" />' },
    global: {
      mocks: { $store: { getters, dispatch } },
      stubs: {
        ConversationHeader,
        MessagesView,
        EmptyState,
        DashboardAppFrame: Frame,
        WootTabs,
        WootTabsItem,
      },
    },
  });
  return { wrapper, dispatch };
};

describe('ConversationBox behaviour', () => {
  it('shows the empty state without a conversation', () => {
    const getters = reactive({
      getSelectedChat: {},
      'dashboardApps/getRecords': [],
    });
    const { wrapper, dispatch } = mountBox(getters, {
      isOnExpandedLayout: false,
    });
    expect(dispatch.mock.calls).toEqual([['dashboardApps/get']]);
    expect(wrapper.findComponent(EmptyState).props('isOnExpandedLayout')).toBe(
      false
    );
    expect(wrapper.classes()).toContain('border-l');
    expect(wrapper.find('header').exists()).toBe(false);
    expect(wrapper.find('.extra').exists()).toBe(true);

    const inbox = mountBox(getters, { isInboxView: true }).wrapper;
    expect(inbox.find('.empty').exists()).toBe(false);
  });

  it('loads an open conversation with dashboard apps', async () => {
    const getters = reactive({
      getSelectedChat: { id: 5, inbox_id: 2 },
      'dashboardApps/getRecords': [
        { id: 1, title: 'CRM', content: [{ url: 'https://crm' }] },
        { id: 2, title: 'Orders', content: [{ url: 'https://orders' }] },
      ],
    });
    const { wrapper, dispatch } = mountBox(getters, { inboxId: 2 });
    expect(dispatch.mock.calls).toEqual([
      [
        'inboxAssignableAgents/fetch',
        { inboxIds: [2], includeAIAssignees: true },
      ],
      ['conversationLabels/get', 5],
      ['dashboardApps/get'],
    ]);
    expect(wrapper.findComponent(ConversationHeader).props()).toEqual({
      chat: getters.getSelectedChat,
      showBackButton: true,
    });
    expect(wrapper.find('header').classes()).not.toContain('border-b');
    // Unused by the template, but kept as part of the component's API.
    expect(wrapper.vm.showContactPanel).toBe(5);
    expect(wrapper.findComponent(MessagesView).props()).toEqual({
      inboxId: 2,
      isInboxView: false,
    });
    expect(wrapper.findAll('.tab').map(t => t.text())).toEqual([
      'CONVERSATION.DASHBOARD_APP_TAB_MESSAGES',
      'CRM',
      'Orders',
    ]);
    const frames = () => wrapper.findAllComponents(Frame);
    expect(frames().map(f => f.props('isVisible'))).toEqual([false, false]);
    expect(frames()[1].props()).toMatchObject({
      config: [{ url: 'https://orders' }],
      position: 1,
    });

    await wrapper.findComponent(WootTabs).vm.$emit('change', 2);
    expect(wrapper.findComponent(WootTabs).props('index')).toBe(2);
    expect(frames().map(f => f.props('isVisible'))).toEqual([false, true]);

    dispatch.mockClear();
    getters.getSelectedChat = { id: 6, inbox_id: 3 };
    await wrapper.vm.$nextTick();
    expect(dispatch).toHaveBeenCalledWith('conversationLabels/get', 6);
    expect(dispatch).toHaveBeenCalledWith('inboxAssignableAgents/fetch', {
      inboxIds: [3],
      includeAIAssignees: true,
    });
    expect(wrapper.findComponent(WootTabs).props('index')).toBe(0);
  });

  it('skips fetches when the conversation is cleared', async () => {
    const getters = reactive({
      getSelectedChat: { id: 5, inbox_id: 2 },
      'dashboardApps/getRecords': [],
    });
    const { wrapper, dispatch } = mountBox(getters, { isInboxView: true });
    expect(
      wrapper.findComponent(ConversationHeader).props('showBackButton')
    ).toBe(false);
    expect(wrapper.find('header').classes()).toContain('border-b');
    expect(wrapper.findComponent(WootTabs).exists()).toBe(false);

    dispatch.mockClear();
    getters.getSelectedChat = { inbox_id: 4 };
    await wrapper.vm.$nextTick();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
