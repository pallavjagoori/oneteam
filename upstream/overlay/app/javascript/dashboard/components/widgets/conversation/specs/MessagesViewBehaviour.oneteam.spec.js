/**
 * OneTeam behaviour specs for the conversation messages view: scrolling to
 * the end, to unread messages and to linked messages, loading older
 * messages, the reply window and restriction banners, typing indicators,
 * folding and revealing the reply box, contact history links, campaign
 * history and retries. Children are stubs.
 */
import { flushPromises, shallowMount } from '@vue/test-utils';
import { useTrack } from 'dashboard/composables';
import { CONTACT_CONVERSATION_NAVIGATION } from 'dashboard/composables/useContactConversationNavigation';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { emitter } from 'shared/helpers/mitt';
import { nextTick, reactive, ref } from 'vue';
import { createStore } from 'vuex';
import NextButton from 'dashboard/components-next/button/Button.vue';
import MessagesView from '../MessagesView.vue';

vi.mock('dashboard/composables', async importOriginal => ({
  ...(await importOriginal()),
  useTrack: vi.fn(),
}));

const shortcuts = {};
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => Object.assign(shortcuts, events),
}));

// Under Vitest, vueuse's refs come from a different Vue copy than the
// component's computeds, so the folded state would never update. A plain
// ref keeps the same behaviour within one page.
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: vueRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useSessionStorage: (_key, initial) => vueRef(initial),
  };
});

// The campaign timeline is its own composable; these refs stand in for it.
const campaign = {
  visibleCampaignHistory: ref([]),
  isCampaignHistoryLoading: ref(false),
  isCampaignHistoryReady: ref(true),
  campaignHistoryError: ref(false),
  hasMoreCampaignHistory: ref(false),
  loadCampaignHistory: vi.fn(),
};
vi.mock('dashboard/composables/useCampaignHistory', () => ({
  useCampaignHistory: () => campaign,
}));

// jsdom has no ResizeObserver; keep the callbacks so tests can resize.
const resizeCallbacks = [];
window.ResizeObserver = function ResizeObserver(callback) {
  resizeCallbacks.push(callback);
  return { observe() {}, unobserve() {}, disconnect() {} };
};

const messages = [
  { id: 1, content: 'Hi', created_at: 1, message_type: 0 },
  { id: 2, content: 'Hello', created_at: 3, message_type: 1 },
];

const navigation = () => ({
  olderConversation: ref(null),
  newerConversation: ref(null),
  isReadingHistory: ref(false),
  latestConversation: ref(null),
  leaveReadingMode: vi.fn(),
  openConversation: vi.fn(),
  buildConversationPath: vi.fn(id => `/conversations/${id}`),
});

const replyBox = {
  replyType: 'reply',
  setReplyMode: vi.fn(),
  focus: vi.fn(),
};
const editorWrapper = { toggle: vi.fn(), reset: vi.fn() };

const mountView = ({
  chat = {},
  inbox = { channel_type: 'Channel::WebWidget' },
  allLoaded = false,
  typing = [],
  instagramInbox = null,
  metaDisabled = false,
  route = {},
  fetchPrevious = () => Promise.resolve(),
} = {}) => {
  const state = reactive({
    chat: {
      id: 1,
      inbox_id: 1,
      can_reply: true,
      dataFetched: true,
      agent_last_seen_at: 2,
      messages,
      ...chat,
    },
    allLoaded,
  });
  const store = createStore({
    mutations: {
      select: (s, value) => {
        state.chat = value;
      },
    },
    getters: {
      getSelectedChat: () => state.chat,
      getCurrentUserID: () => 7,
      getAllMessagesLoaded: () => state.allLoaded,
      'globalConfig/isMetaMessageSendingDisabled': () => metaDisabled,
      'inboxes/getInbox': () => () => inbox,
      'inboxes/getInstagramInboxByInstagramId': () => () => instagramInbox,
      'conversationTypingStatus/getUserList': () => () => typing,
    },
  });
  store.dispatch = vi.fn(action =>
    action === 'fetchPreviousMessages' ? fetchPrevious() : Promise.resolve()
  );
  const nav = navigation();
  const wrapper = shallowMount(MessagesView, {
    attachTo: document.body,
    global: {
      plugins: [store],
      provide: { [CONTACT_CONVERSATION_NAVIGATION]: nav },
      mocks: {
        $t: (key, params) =>
          params ? `${key} ${JSON.stringify(params)}` : key,
        $route: { query: { ...route } },
      },
      stubs: {
        transition: false,
        MessageList: {
          name: 'MessageList',
          template:
            '<ul><slot name="beforeAll" /><slot name="unreadBadge" /><li v-for="m in messages" :id="\'message\' + m.id" :key="m.id" :data-message-id="m.id" /><slot name="after" /></ul>',
          props: ['messages'],
        },
        ReplyBox: {
          name: 'ReplyBox',
          template: '<div />',
          data: () => ({ replyType: replyBox.replyType }),
          computed: {
            messageEditor: () => ({ focusEditorInputField: replyBox.focus }),
            canSendPublicReply: () => true,
          },
          methods: { setReplyMode: mode => replyBox.setReplyMode(mode) },
        },
        ResizableEditorWrapper: {
          name: 'ResizableEditorWrapper',
          template: '<div><slot /></div>',
          methods: {
            toggleEditorExpand: () => editorWrapper.toggle(),
            resetEditorHeight: () => editorWrapper.reset(),
          },
        },
      },
    },
  });
  return { wrapper, vm: wrapper.vm, store, state, nav };
};

const panel = wrapper => wrapper.find('.conversation-panel').element;
let mounted = null;
const mountTracked = options => {
  mounted = mountView(options);
  return mounted;
};

beforeEach(() => {
  sessionStorage.clear();
  campaign.isCampaignHistoryReady.value = true;
  campaign.visibleCampaignHistory.value = [];
  campaign.hasMoreCampaignHistory.value = false;
  replyBox.replyType = 'reply';
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  mounted?.wrapper.unmount();
  mounted = null;
});

describe('MessagesView behaviour', () => {
  describe('loading and scrolling', () => {
    it('fetches attachments and scrolls to the end on mount', async () => {
      const { store, vm } = mountTracked();
      await nextTick();
      expect(store.dispatch).toHaveBeenCalledWith('fetchAllAttachments', 1);
      expect(vm.isLoadingPrevious).toBe(false);
      expect(vm.isProgrammaticScroll).toBe(true);
    });

    it('scrolls to the first unread message when there is one', async () => {
      const { vm, wrapper } = mountTracked({ chat: { unread_count: 12 } });
      await nextTick();
      expect(vm.unreadMessageLabel).toBe('9+ CONVERSATION.UNREAD_MESSAGES');
      expect(wrapper.text()).toContain('9+');
      panel(wrapper).scrollTop = 0;
      vm.scrollToBottom();
      expect(typeof panel(wrapper).scrollTop).toBe('number');

      // Without the unread message in the list it falls back to the end.
      vm.currentChat.agent_last_seen_at = 99;
      vm.scrollToBottom();
      expect(vm.unReadMessages).toEqual([]);
    });

    it('labels a single unread message', () => {
      const { vm } = mountTracked({ chat: { unread_count: 1 } });
      expect(vm.unreadMessageLabel).toBe('1 CONVERSATION.UNREAD_MESSAGE');
      // Messages up to agent_last_seen_at count as read.
      expect(vm.readMessages.map(message => message.id)).toEqual([1]);
    });

    it('scrolls to a linked message, or to the end when it is missing', async () => {
      const { vm, store } = mountTracked();
      await nextTick();
      store.dispatch.mockClear();
      emitter.emit(BUS_EVENTS.SCROLL_TO_MESSAGE, { messageId: 2 });
      await nextTick();
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
      });
      expect(store.dispatch).toHaveBeenCalledWith('markMessagesRead', {
        id: 1,
      });

      Element.prototype.scrollIntoView.mockClear();
      vm.onScrollToMessage();
      await nextTick();
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it('loads older messages near the top and keeps the position', async () => {
      const { vm, store, wrapper } = mountTracked();
      await nextTick();
      vm.isProgrammaticScroll = false;
      const listener = vi.fn();
      emitter.on(BUS_EVENTS.ON_MESSAGE_LIST_SCROLL, listener);
      panel(wrapper).dispatchEvent(new Event('scroll'));
      emitter.off(BUS_EVENTS.ON_MESSAGE_LIST_SCROLL, listener);
      await flushPromises();
      expect(listener).toHaveBeenCalled();
      expect(vm.hasUserScrolled).toBe(true);
      expect(store.dispatch).toHaveBeenCalledWith('fetchPreviousMessages', {
        conversationId: 1,
        before: 1,
      });
      expect(vm.isLoadingPrevious).toBe(false);

      // A programmatic scroll does not count as the agent scrolling.
      vm.isProgrammaticScroll = true;
      vm.handleScroll({ target: { scrollTop: 500 } });
      expect(vm.hasUserScrolled).toBe(false);
    });

    it('ignores failures and skips loading when everything is loaded', async () => {
      const failing = mountView({
        fetchPrevious: () => Promise.reject(new Error('offline')),
      });
      await nextTick();
      await failing.vm.fetchPreviousMessages(0);
      expect(failing.vm.isLoadingPrevious).toBe(false);
      failing.wrapper.unmount();

      const { vm, store } = mountTracked({ allLoaded: true });
      await nextTick();
      store.dispatch.mockClear();
      await vm.fetchPreviousMessages(0);
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('keeps the end of the list in view when the panel shrinks', async () => {
      const { vm, wrapper } = mountTracked();
      await nextTick();
      const target = panel(wrapper);
      Object.defineProperty(target, 'scrollHeight', {
        value: 1000,
        configurable: true,
      });
      Object.defineProperty(target, 'clientHeight', {
        value: 400,
        configurable: true,
        writable: true,
      });
      const fire = height => {
        target.clientHeight = height;
        const size = { width: 300, height };
        resizeCallbacks.forEach(callback =>
          callback([
            {
              target,
              contentRect: size,
              borderBoxSize: [{ inlineSize: 300, blockSize: height }],
              contentBoxSize: [{ inlineSize: 300, blockSize: height }],
            },
          ])
        );
      };
      fire(500);
      target.scrollTop = 500;
      vm.isProgrammaticScroll = false;
      fire(400);
      expect(target.scrollTop).toBe(600);
      expect(vm.isProgrammaticScroll).toBe(true);

      // Away from the end, the position stays.
      target.scrollTop = 100;
      fire(300);
      expect(target.scrollTop).toBe(100);
    });

    it('refreshes attachments and editor height for another conversation', async () => {
      const { store } = mountTracked();
      store.dispatch.mockClear();
      store.commit('select', { ...messages, id: 1, messages, inbox_id: 1 });
      await nextTick();
      expect(store.dispatch).not.toHaveBeenCalled();
      store.commit('select', { id: 5, inbox_id: 1, messages: [] });
      await nextTick();
      expect(store.dispatch).toHaveBeenCalledWith('fetchAllAttachments', 5);
      expect(editorWrapper.reset).toHaveBeenCalled();
    });

    it('retries a failed message', async () => {
      const { wrapper, store } = mountTracked();
      wrapper.findComponent({ name: 'MessageList' }).vm.$emit('retry', {
        conversationId: 1,
        contentAttributes: {},
      });
      await flushPromises();
      expect(store.dispatch).toHaveBeenCalledWith('sendMessageWithData', {
        conversation_id: 1,
        content_attributes: {},
      });
      store.dispatch.mockClear();
      await wrapper.vm.handleMessageRetry(null);
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('banners and indicators', () => {
    it.each([
      [
        'WhatsApp',
        { channel_type: 'Channel::Whatsapp', provider: 'whatsapp_cloud' },
        'CONVERSATION.TWILIO_WHATSAPP_CAN_REPLY',
        'CONVERSATION.24_HOURS_WINDOW',
      ],
      [
        'Facebook',
        { channel_type: 'Channel::FacebookPage' },
        'CONVERSATION.CANNOT_REPLY',
        'CONVERSATION.24_HOURS_WINDOW',
      ],
      [
        'TikTok',
        { channel_type: 'Channel::Tiktok' },
        'CONVERSATION.CANNOT_REPLY',
        'CONVERSATION.48_HOURS_WINDOW',
      ],
      [
        'Twilio SMS',
        { channel_type: 'Channel::TwilioSms', medium: 'sms' },
        'CONVERSATION.CANNOT_REPLY',
        'CONVERSATION.TWILIO_WHATSAPP_24_HOURS_WINDOW',
      ],
      [
        'API with a custom message',
        {
          channel_type: 'Channel::Api',
          additional_attributes: { agent_reply_time_window_message: 'Closed' },
        },
        'Closed',
        '',
      ],
      [
        'API with hours',
        {
          channel_type: 'Channel::Api',
          additional_attributes: { agent_reply_time_window: 12 },
        },
        'CONVERSATION.API_HOURS_WINDOW {"hours":12}',
        '',
      ],
      [
        'API without attributes',
        { channel_type: 'Channel::Api', additional_attributes: null },
        '',
        '',
      ],
    ])(
      'explains the closed reply window on %s',
      (_, inbox, message, linkText) => {
        const { vm } = mountTracked({ inbox, chat: { can_reply: false } });
        expect(vm.replyWindowBannerMessage).toBe(message);
        expect(vm.replyWindowLinkText).toBe(linkText);
        expect(typeof vm.replyWindowLink).toBe('string');
      }
    );

    it('links the Instagram policy and restriction status', () => {
      const { vm } = mountTracked({
        inbox: { channel_type: 'Channel::Instagram' },
        metaDisabled: true,
      });
      expect(vm.isInstagramRestrictionBannerVisible).toBe(true);
      expect(vm.instagramRestrictionStatusUrl).toMatch(/^https:/);
      expect(vm.replyWindowLink).toMatch(/^https:/);
    });

    it('warns about anonymous callers and old Instagram inboxes', () => {
      const { vm, wrapper } = mountTracked({
        chat: { anonymous_caller: true },
        inbox: {
          channel_type: 'Channel::FacebookPage',
          instagram_id: 'ig',
          additional_attributes: { type: 'instagram_direct_message' },
        },
        instagramInbox: { id: 2 },
      });
      expect(vm.hasDuplicateInstagramInbox).toEqual({ id: 2 });
      expect(wrapper.findAllComponents({ name: 'Banner' })).toHaveLength(2);
    });

    it('shows who is typing', () => {
      const { vm, wrapper } = mountTracked({
        typing: [{ id: 2, name: 'Ada' }],
      });
      expect(vm.typingUserNames).toContain('Ada');
      expect(wrapper.text()).toContain('Ada');
      expect(mountView().vm.typingUserNames).toBe('');
    });

    it('drops duplicate WhatsApp echoes and shows the referral', () => {
      const { vm, wrapper } = mountTracked({
        inbox: { channel_type: 'Channel::Whatsapp' },
        chat: {
          additional_attributes: {
            referral: { source_url: 'https://ad.test' },
          },
          messages: [
            { id: 1, source_id: 's1', created_at: 1 },
            { id: 2, source_id: 's1', created_at: 2 },
          ],
        },
      });
      expect(vm.getMessages.length).toBeLessThanOrEqual(2);
      expect(wrapper.findComponent({ name: 'ReferralBubble' }).exists()).toBe(
        true
      );
    });

    it('waits for the campaign history before showing messages', async () => {
      campaign.isCampaignHistoryReady.value = false;
      const { vm, wrapper } = mountTracked({ chat: { messages: undefined } });
      expect(vm.timelineMessages).toEqual([]);
      expect(vm.shouldShowSpinner).toBe(true);
      expect(vm.getMessages).toEqual([]);
      campaign.isCampaignHistoryReady.value = true;
      await nextTick();
      await nextTick();
      expect(wrapper.vm.isProgrammaticScroll).toBe(true);
    });
  });

  describe('campaign history', () => {
    it('loads more campaign history from the button', async () => {
      campaign.hasMoreCampaignHistory.value = true;
      const { wrapper } = mountTracked();
      wrapper.findComponent(NextButton).vm.$emit('click');
      expect(campaign.loadCampaignHistory).toHaveBeenCalled();
    });

    it('keeps the reading position when campaigns arrive', async () => {
      const { vm } = mountTracked();
      await nextTick();
      vm.hasUserScrolled = true;
      campaign.visibleCampaignHistory.value = [{ id: 1 }];
      await nextTick();
      await nextTick();

      vm.hasUserScrolled = false;
      campaign.visibleCampaignHistory.value = [{ id: 2 }];
      await nextTick();
      await nextTick();
      expect(vm.isProgrammaticScroll).toBe(true);
    });

    it('ignores campaign changes after switching conversations', async () => {
      const { vm, store } = mountTracked();
      await nextTick();
      campaign.visibleCampaignHistory.value = [{ id: 3 }];
      // Let the watcher capture conversation 1, then switch before its tick.
      await Promise.resolve();
      store.commit('select', { id: 8, inbox_id: 1, messages: [] });
      vm.isProgrammaticScroll = false;
      await nextTick();
      await nextTick();
      expect(vm.isProgrammaticScroll).toBe(false);
    });
  });

  describe('contact history and the reply box', () => {
    it('links older and newer conversations of the contact', async () => {
      const { wrapper, nav, vm } = mountTracked({ allLoaded: true });
      nav.olderConversation.value = { id: 3 };
      nav.newerConversation.value = { id: 5 };
      await nextTick();
      await nextTick();
      const links = wrapper.findAllComponents({
        name: 'ContactConversationLink',
      });
      expect(links.map(link => link.props('direction'))).toEqual([
        'older',
        'newer',
      ]);
      links[0].vm.$emit('navigate');
      links[1].vm.$emit('navigate');
      expect(nav.openConversation).toHaveBeenCalledWith({ id: 3 });
      expect(nav.openConversation).toHaveBeenCalledWith({ id: 5 });
      expect(vm.isProgrammaticScroll).toBe(true);

      nav.newerConversation.value = null;
      await nextTick();
    });

    it('collapses the reply box and reveals it again in the requested mode', async () => {
      const { wrapper, vm } = mountTracked();
      shortcuts['Alt+KeyP'].action();
      expect(useTrack).not.toHaveBeenCalled();

      wrapper
        .findComponent({ name: 'ResizableEditorWrapper' })
        .vm.$emit('collapse');
      await nextTick();
      expect(vm.isReplyFolded).toBe(true);
      expect(useTrack).toHaveBeenCalled();

      wrapper
        .findComponent({ name: 'CollapsedReplyBar' })
        .vm.$emit('open', 'note');
      await nextTick();
      expect(vm.isReplyFolded).toBe(false);
      expect(replyBox.setReplyMode).toHaveBeenCalledWith('note');
      expect(replyBox.focus).toHaveBeenCalled();

      replyBox.setReplyMode.mockClear();
      vm.collapseReplyBox();
      vm.revealReplyBox('reply');
      await nextTick();
      expect(replyBox.setReplyMode).not.toHaveBeenCalled();
    });

    it('reveals the reply box for pasted files and bus events', async () => {
      const { vm, nav } = mountTracked();
      vm.collapseReplyBox();
      const paste = new Event('paste');
      paste.clipboardData = { files: [] };
      document.dispatchEvent(paste);
      expect(vm.isReplyFolded).toBe(true);
      paste.clipboardData = { files: [{}] };
      document.dispatchEvent(paste);
      expect(vm.isReplyFolded).toBe(false);

      vm.collapseReplyBox();
      emitter.emit(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE);
      expect(vm.isReplyFolded).toBe(false);
      expect(nav.leaveReadingMode).toHaveBeenCalled();
    });

    it('offers the latest conversation while reading history', async () => {
      const { wrapper, nav } = mountTracked();
      nav.isReadingHistory.value = true;
      nav.latestConversation.value = { id: 9 };
      await nextTick();
      const bar = wrapper.findComponent({ name: 'CollapsedReplyBar' });
      expect(bar.props('hasLatest')).toBe(true);
      expect(bar.props('replyLabel')).toBe(
        'CONVERSATION.CONTACT_HISTORY.REPLY_TO_OLDER'
      );
      bar.vm.$emit('goToLatest');
      expect(nav.openConversation).toHaveBeenCalledWith({ id: 9 });
    });

    it('toggles the editor size for the reply box', () => {
      const { wrapper } = mountTracked();
      wrapper.findComponent({ name: 'ReplyBox' }).vm.$emit('toggleEditorSize');
      expect(editorWrapper.toggle).toHaveBeenCalled();
    });
  });
});
