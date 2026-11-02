/**
 * OneTeam behaviour spec for the conversation panel's empty state.
 *
 * Covers the loading message for inboxes and conversations, onboarding
 * for admins (full-height layout) and a message for agents when there
 * are no inboxes, the no-conversations message, and the "select a
 * conversation" or 404 message depending on the layout.
 */
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { useAdmin } from 'dashboard/composables/useAdmin';
import EmptyState from '../EmptyState.vue';

vi.mock('dashboard/composables/useAdmin', () => ({ useAdmin: vi.fn() }));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountScopedUrl: path => `/app/accounts/1/${path}` }),
}));

const EmptyStateMessage = {
  name: 'EmptyStateMessage',
  props: ['message'],
  template: '<p class="msg">{{ message }}</p>',
};
const OnboardingView = {
  name: 'OnboardingView',
  template: '<div class="onboarding" />',
};
const WootLoadingState = {
  name: 'WootLoadingState',
  props: ['message'],
  template: '<div class="loading">{{ message }}</div>',
};

const mountEmpty = (
  {
    admin = true,
    inboxes = [{ id: 1 }],
    isFetching = false,
    loading = false,
    conversations = [],
    chat = {},
  },
  props = {}
) => {
  useAdmin.mockReturnValue({ isAdmin: admin });
  const store = createStore({
    getters: {
      getSelectedChat: () => chat,
      getAllConversations: () => conversations,
      getChatListLoadingStatus: () => loading,
      'inboxes/getInboxes': () => inboxes,
      'inboxes/getUIFlags': () => ({ isFetching }),
    },
  });
  return mount(EmptyState, {
    props,
    global: {
      plugins: [store],
      stubs: { EmptyStateMessage, OnboardingView, WootLoadingState },
    },
  });
};

const centered =
  'flex-1 min-w-0 px-0 flex flex-col items-center justify-center h-full bg-n-surface-1';

describe('EmptyState behaviour', () => {
  it('shows a loading message for inboxes or conversations', () => {
    const fetching = mountEmpty({ inboxes: [], isFetching: true });
    expect(fetching.find('.loading').text()).toBe(
      'CONVERSATION.LOADING_INBOXES'
    );
    expect(fetching.find('.onboarding').exists()).toBe(false);
    expect(fetching.find('.msg').exists()).toBe(false);
    expect(fetching.attributes('class')).toBe(centered);

    const loading = mountEmpty({ loading: true });
    expect(loading.find('.loading').text()).toBe(
      'CONVERSATION.LOADING_CONVERSATIONS'
    );
    expect(loading.find('.msg').exists()).toBe(false);
  });

  it('onboards admins and informs agents when there are no inboxes', () => {
    const admin = mountEmpty({ inboxes: [] });
    expect(admin.find('.onboarding').exists()).toBe(true);
    expect(admin.attributes('class')).toBe('h-full overflow-auto w-full');
    expect(admin.vm.newInboxURL).toBe('/app/accounts/1/settings/inboxes/new');

    const agent = mountEmpty({ inboxes: [], admin: false });
    expect(agent.find('.onboarding').exists()).toBe(false);
    expect(agent.find('.msg').text()).toBe('CONVERSATION.NO_INBOX_AGENT');
    expect(agent.attributes('class')).toBe(centered);
  });

  it('shows the no-conversations and select-a-conversation messages', () => {
    expect(mountEmpty({}).find('.msg').text()).toBe(
      'CONVERSATION.NO_MESSAGE_1'
    );
    expect(
      mountEmpty({ conversations: [{ id: 1 }] })
        .find('.msg')
        .text()
    ).toBe('CONVERSATION.SELECT_A_CONVERSATION');
    expect(
      mountEmpty({ conversations: [{ id: 1 }] }, { isOnExpandedLayout: true })
        .find('.msg')
        .text()
    ).toBe('CONVERSATION.404');
    expect(
      mountEmpty({ conversations: [{ id: 1 }], chat: { id: 1 } })
        .find('.msg')
        .exists()
    ).toBe(false);
  });
});
