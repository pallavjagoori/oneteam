/**
 * OneTeam behaviour spec for the next-gen Message bubble container.
 *
 * Covers variant / orientation / bubble selection, avatar info, context menu
 * options and events, reply-to, forward email, highlight timer and the
 * render guard. Child bubbles are shallow stubs; the provided message
 * context is captured to read the computed variant and orientation.
 */
import { shallowMount } from '@vue/test-utils';
import Message from '../Message.vue';
import TextBubble from '../bubbles/Text/Index.vue';
import ActivityBubble from '../bubbles/Activity.vue';
import ImageBubble from '../bubbles/Image.vue';
import FileBubble from '../bubbles/File.vue';
import AudioBubble from '../bubbles/Audio.vue';
import VideoBubble from '../bubbles/Video.vue';
import EmbedBubble from '../bubbles/Embed.vue';
import FallbackBubble from '../bubbles/Fallback.vue';
import InstagramStoryBubble from '../bubbles/InstagramStory.vue';
import EmailBubble from '../bubbles/Email/Index.vue';
import UnsupportedBubble from '../bubbles/Unsupported.vue';
import ContactBubble from '../bubbles/Contact.vue';
import DyteBubble from '../bubbles/Dyte.vue';
import LocationBubble from '../bubbles/Location.vue';
import CSATBubble from '../bubbles/CSAT.vue';
import FormBubble from '../bubbles/Form.vue';
import VoiceCallBubble from '../bubbles/VoiceCall.vue';
import WhatsappFlowResponseBubble from '../bubbles/WhatsappFlowResponse.vue';
import WhatsappReferral from '../bubbles/Text/WhatsappReferral.vue';
import MessageError from '../MessageError.vue';
import ForwardEmailPanel from '../forward/ForwardEmailPanel.vue';
import ForwardedEmailBanner from '../forward/ForwardedEmailBanner.vue';
import Avatar from 'next/avatar/Avatar.vue';
import ContextMenu from 'dashboard/modules/conversations/components/MessageContextMenu.vue';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';

const state = vi.hoisted(() => ({
  getters: {},
  route: { query: {} },
  context: null,
  translation: '',
  timeouts: [],
}));

vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: key => computed(() => state.getters[key]) };
});
vi.mock('vue-router', () => ({ useRoute: () => state.route }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));
vi.mock('shared/composables/useBranding', () => ({
  useBranding: () => ({ replaceInstallationName: text => `[${text}]` }),
}));
vi.mock('dashboard/composables/useTranslations', async () => {
  const { computed } = await import('vue');
  return {
    useTranslations: (contentAttributes, contactSide) => ({
      translationContent: computed(() => {
        state.translationArgs = [contentAttributes.value, contactSide.value];
        return state.translation;
      }),
    }),
  };
});
vi.mock('@vueuse/core', () => ({
  useTimeoutFn: (fn, ms) => state.timeouts.push({ fn, ms }),
}));
vi.mock('shared/helpers/mitt', () => ({ emitter: { emit: vi.fn() } }));
vi.mock('shared/helpers/localStorage', () => ({
  LocalStorage: { updateJsonStore: vi.fn() },
}));
vi.mock('../provider.js', () => ({
  provideMessageContext: context => {
    state.context = context;
  },
}));

const { useTrack } = await import('dashboard/composables');
const { emitter } = await import('shared/helpers/mitt');
const { LocalStorage } = await import('shared/helpers/localStorage');

const INCOMING = 0;
const OUTGOING = 1;
const ACTIVITY = 2;
const TEMPLATE = 3;

const baseProps = {
  id: 7,
  messageType: INCOMING,
  status: 'sent',
  content: 'Hello',
  conversationId: 3,
  createdAt: 1700000000,
  currentUserId: 1,
  sender: { id: 9, type: 'Contact', name: 'Jane', thumbnail: 'jane.png' },
};

const mountMessage = (props = {}, { inbox = null, cloud = false } = {}) => {
  state.getters = {
    'inboxes/getInbox': () => inbox,
    'globalConfig/isOnChatwootCloud': cloud,
    getAutoTranslate: { language: '' },
    getMessageTranslationState: () => ({ pending: false }),
  };
  return shallowMount(Message, {
    props: { ...baseProps, ...props },
  });
};

const ctx = () => state.context;
const agentSender = { id: 2, type: 'User', name: 'Ann' };

beforeEach(() => {
  state.route = { query: {} };
  state.context = null;
  state.translation = '';
  state.timeouts = [];
  vi.clearAllMocks();
});

describe('Message variant', () => {
  it.each([
    [{ private: true }, 'private'],
    [{ isEmailInbox: true, messageType: OUTGOING }, 'email'],
    [{ isEmailInbox: true, messageType: ACTIVITY }, 'activity'],
    [{ contentType: 'incoming_email' }, 'email'],
    [{ status: 'failed' }, 'error'],
    [{ contentAttributes: { isUnsupported: true } }, 'unsupported'],
    [{ contentAttributes: { externalEcho: true } }, 'agent'],
    [{ messageType: OUTGOING, sender: { id: 1, type: 'agent_bot' } }, 'bot'],
    [{ messageType: OUTGOING, sender: null, senderType: 'agent_bot' }, 'bot'],
    [{ messageType: OUTGOING, sender: null }, 'bot'],
    [
      {
        messageType: OUTGOING,
        sender: null,
        additionalAttributes: { senderName: 'Slack' },
      },
      'agent',
    ],
    [{ messageType: INCOMING, sender: { id: 1, type: 'agent_bot' } }, 'user'],
    [{ messageType: ACTIVITY }, 'activity'],
    [{ messageType: OUTGOING }, 'agent'],
    [{ messageType: TEMPLATE }, 'template'],
  ])('derives %o as %s', (props, expected) => {
    mountMessage(props);
    expect(ctx().variant.value).toBe(expected);
  });

  it('falls back to user for an unknown message type', () => {
    // Bypass the prop validator to reach the default branch.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mountMessage({ messageType: 9 });
    expect(ctx().variant.value).toBe('user');
    warn.mockRestore();
  });

  it('flags captain messages from sender or senderType', () => {
    mountMessage({ sender: { id: 1, type: 'captain_assistant' } });
    expect(ctx().isCaptainMessage.value).toBe(true);
    mountMessage({ sender: null, senderType: 'Contact' });
    expect(ctx().isCaptainMessage.value).toBe(false);
    expect(ctx().isPrivate.value).toBe(false);
  });
});

describe('Message orientation', () => {
  it.each([
    [{ messageType: ACTIVITY }, false, 'center'],
    [{ messageType: OUTGOING, status: 'progress' }, true, 'right'],
    [{ sender: null, senderId: null }, true, 'right'],
    [{ sender: { id: 1, type: 'agent_bot' } }, true, 'right'],
    [{ sender: { id: 1, type: 'captain_assistant' } }, true, 'right'],
    [{ sender: { id: 1, type: 'user' } }, true, 'right'],
    [{ sender: null, senderId: 4, senderType: 'Contact' }, false, 'left'],
    [{}, false, 'left'],
  ])('orients %o', (props, isBotOrAgent, orientation) => {
    const wrapper = mountMessage(props);
    expect(ctx().isBotOrAgentMessage.value).toBe(isBotOrAgent);
    expect(ctx().orientation.value).toBe(orientation);
    const justify = {
      left: 'justify-start',
      right: 'justify-end',
      center: 'justify-center',
    }[orientation];
    expect(wrapper.classes()).toContain(justify);
  });

  it('renders the avatar only on the right side and not when grouped', () => {
    const right = mountMessage({ messageType: OUTGOING, sender: agentSender });
    expect(right.findComponent(Avatar).exists()).toBe(true);
    expect(right.find('.grid-cols-\\[1fr_24px\\]').exists()).toBe(true);

    const left = mountMessage();
    expect(left.findComponent(Avatar).exists()).toBe(false);
    expect(left.find('.grid-cols-1fr').exists()).toBe(true);

    const grouped = mountMessage({
      messageType: OUTGOING,
      sender: agentSender,
      groupWithNext: true,
    });
    expect(grouped.findComponent(Avatar).exists()).toBe(false);
    expect(grouped.classes()).toContain('group-with-next');
    expect(ctx().shouldGroupWithNext.value).toBe(true);
  });

  it('hides the avatar for private activity notes', () => {
    const wrapper = mountMessage({
      messageType: ACTIVITY,
      private: true,
      sender: agentSender,
    });
    expect(ctx().variant.value).toBe('private');
    expect(wrapper.findComponent(Avatar).exists()).toBe(false);
  });

  it('passes the attributes and contact side to the translations', () => {
    mountMessage({ contentAttributes: { a: 1 } });
    expect(state.translationArgs).toEqual([{ a: 1 }, true]);
    mountMessage({ sender: null, senderType: 'User', messageType: OUTGOING });
    expect(state.translationArgs).toEqual([{}, false]);
    expect(ctx().contactSide.value).toBe(false);
  });

  it('never groups failed messages', () => {
    mountMessage({ status: 'failed', groupWithNext: true });
    expect(ctx().shouldGroupWithNext.value).toBe(false);
  });

  it('renders the activity bubble for activity messages', () => {
    const wrapper = mountMessage({ messageType: ACTIVITY });
    expect(wrapper.findComponent(ActivityBubble).props()).toBeDefined();
    expect(wrapper.findComponent(ContextMenu).exists()).toBe(false);
  });
});

describe('Message bubble selection', () => {
  const file = fileType => ({ attachments: [{ fileType }] });

  it.each([
    [{ isEmailInbox: true, messageType: INCOMING }, EmailBubble],
    [
      { isEmailInbox: true, messageType: ACTIVITY, content: 'x' },
      ActivityBubble,
    ],
    [{ isEmailInbox: true, private: true }, TextBubble],
    [{ isEmailInbox: true, messageType: TEMPLATE }, TextBubble],
    [
      { contentAttributes: { whatsappFlowResponse: { a: 1 } } },
      WhatsappFlowResponseBubble,
    ],
    [{ contentType: 'input_csat' }, CSATBubble],
    [{ contentType: 'input_select' }, FormBubble],
    [{ contentType: 'form' }, FormBubble],
    [{ contentType: 'voice_call' }, VoiceCallBubble],
    [{ contentType: 'incoming_email' }, EmailBubble],
    [{ contentAttributes: { isUnsupported: true } }, UnsupportedBubble],
    [{ contentAttributes: { type: 'dyte' } }, DyteBubble],
    [
      { contentAttributes: { imageType: 'story_mention' } },
      InstagramStoryBubble,
    ],
    [{ contentAttributes: { imageType: 'ig_post' } }, InstagramStoryBubble],
    [file('fallback'), FallbackBubble],
    [{ ...file('image'), content: null }, ImageBubble],
    [{ ...file('file'), content: null }, FileBubble],
    [{ ...file('audio'), content: null }, AudioBubble],
    [{ ...file('video'), content: null }, VideoBubble],
    [{ ...file('ig_reel'), content: null }, VideoBubble],
    [{ ...file('embed'), content: null }, EmbedBubble],
    [{ ...file('location'), content: null }, LocationBubble],
    [{ ...file('share'), content: null }, TextBubble],
    [{ ...file('contact'), content: 'Jane' }, ContactBubble],
    [{ ...file('image'), content: 'caption' }, TextBubble],
    [
      { attachments: [{ fileType: 'image' }, { fileType: 'file' }] },
      TextBubble,
    ],
    [{}, TextBubble],
  ])('renders %o with the expected bubble', (props, bubble) => {
    const wrapper = mountMessage(props);
    expect(wrapper.findComponent(bubble).exists()).toBe(true);
  });

  it('shows the WhatsApp referral only for user messages with a referral', () => {
    const referral = { sourceUrl: 'https://ad' };
    const user = mountMessage({ contentAttributes: { referral } });
    expect(user.findComponent(WhatsappReferral).props('referral')).toEqual(
      referral
    );
    const agent = mountMessage({
      messageType: OUTGOING,
      contentAttributes: { referral },
    });
    expect(agent.findComponent(WhatsappReferral).exists()).toBe(false);
  });

  it('shows the forwarded banner unless the message was deleted', () => {
    const forwarded = mountMessage({
      contentAttributes: { forwardedMessageId: 2 },
    });
    expect(forwarded.findComponent(ForwardedEmailBanner).exists()).toBe(true);
    const deleted = mountMessage({
      contentAttributes: { forwardedMessageId: 2, deleted: true },
    });
    expect(deleted.findComponent(ForwardedEmailBanner).exists()).toBe(false);
  });

  it('renders the external error and re-emits retry', async () => {
    const wrapper = mountMessage({
      contentAttributes: { externalError: 'Blocked' },
    });
    const error = wrapper.findComponent(MessageError);
    expect(error.props('error')).toBe('Blocked');
    await error.vm.$emit('retry');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
});

describe('Message render guard', () => {
  it('renders nothing without content, attachments or a reason to show', () => {
    expect(mountMessage({ content: null }).html()).toBe('<!--v-if-->');
  });

  it.each([
    [{ attachments: [{ fileType: 'image' }] }],
    [{ contentType: 'incoming_email' }],
    [{ contentAttributes: { isUnsupported: true } }],
    [{ contentType: 'integrations' }],
    [{ contentAttributes: { whatsappFlowResponse: {} } }],
    [{ contentAttributes: { referral: { a: 1 } } }],
    [{ status: 'failed' }],
    [{ contentAttributes: { externalError: 'x' } }],
  ])('renders %o even without content', props => {
    const wrapper = mountMessage({ content: null, ...props });
    expect(wrapper.find('.message-bubble-container').exists()).toBe(true);
  });

  it('hides the context menu for unsupported messages', () => {
    const wrapper = mountMessage({
      contentAttributes: { isUnsupported: true },
    });
    expect(wrapper.find('.context-menu-wrap').exists()).toBe(false);
  });
});

describe('Message avatar info', () => {
  const avatar = wrapper => wrapper.findComponent(Avatar).props();

  it('uses the inbox avatar for external echo messages', () => {
    const wrapper = mountMessage(
      {
        messageType: OUTGOING,
        sender: agentSender,
        contentAttributes: { externalEcho: true },
      },
      { inbox: { name: 'Shop', avatar_url: 'shop.png' } }
    );
    expect(avatar(wrapper)).toMatchObject({ name: 'Shop', src: 'shop.png' });
  });

  it('falls back to the native app name when the echo inbox has no name', () => {
    const wrapper = mountMessage(
      {
        messageType: OUTGOING,
        sender: agentSender,
        contentAttributes: { externalEcho: true },
      },
      { inbox: { avatar_url: 'shop.png' } }
    );
    expect(avatar(wrapper).name).toBe('CONVERSATION.NATIVE_APP');
  });

  it('uses the channel icon when the echo inbox has no avatar', () => {
    const wrapper = mountMessage({
      messageType: OUTGOING,
      sender: agentSender,
      contentAttributes: { externalEcho: true },
      inboxId: 5,
    });
    expect(avatar(wrapper).name).toBe('');
    expect(avatar(wrapper).src).toBe('');
  });

  it('uses integration sender details when there is no sender', () => {
    const slack = mountMessage({
      messageType: OUTGOING,
      sender: null,
      additionalAttributes: { senderName: 'Slack', senderAvatarUrl: 's.png' },
    });
    expect(avatar(slack)).toMatchObject({ name: 'Slack', src: 's.png' });

    const noUrl = mountMessage({
      messageType: OUTGOING,
      sender: null,
      additionalAttributes: { senderName: 'Slack' },
    });
    expect(avatar(noUrl).src).toBe('');

    const bot = mountMessage({
      messageType: OUTGOING,
      sender: null,
      additionalAttributes: null,
    });
    expect(avatar(bot).name).toBe('CONVERSATION.BOT');
  });

  it('uses avatarUrl for bots and thumbnail for everyone else', () => {
    const bot = mountMessage({
      messageType: OUTGOING,
      sender: { id: 1, type: 'agent_bot', name: 'Bot', avatarUrl: 'b.png' },
    });
    expect(avatar(bot)).toMatchObject({ name: 'Bot', src: 'b.png' });

    const bareBot = mountMessage({
      messageType: OUTGOING,
      sender: { id: 1, type: 'captain_assistant' },
    });
    expect(avatar(bareBot)).toMatchObject({ name: '', src: '' });

    const agent = mountMessage({
      messageType: OUTGOING,
      sender: { id: 1, type: 'User', name: 'Ann', thumbnail: 'a.png' },
    });
    expect(avatar(agent)).toMatchObject({ name: 'Ann', src: 'a.png' });

    const bareAgent = mountMessage({
      messageType: OUTGOING,
      sender: { id: 1, type: 'User' },
    });
    expect(avatar(bareAgent)).toMatchObject({ name: '', src: '' });
  });
});

describe('Message context menu', () => {
  const menu = wrapper => wrapper.findComponent(ContextMenu);
  const options = wrapper => menu(wrapper).props('enabledOptions');

  it('enables options for a sent outgoing text message', () => {
    const wrapper = mountMessage({
      messageType: OUTGOING,
      inboxSupportsReplyTo: { outgoing: true },
    });
    expect(options(wrapper)).toEqual({
      copy: true,
      delete: true,
      cannedResponse: true,
      copyLink: true,
      translate: true,
      replyTo: true,
      forwardEmail: false,
      report: false,
    });
    expect(menu(wrapper).props('message')).toEqual({
      id: 7,
      content_attributes: {},
      content: 'Hello',
      conversation_id: 3,
    });
  });

  it('disables actions for failed or processing messages', () => {
    const failed = mountMessage({
      status: 'failed',
      isEmailInbox: true,
      inboxSupportsReplyTo: { outgoing: true },
    });
    expect(options(failed)).toMatchObject({
      delete: false,
      copyLink: false,
      translate: false,
      replyTo: false,
      forwardEmail: false,
    });
    const progress = mountMessage({ status: 'progress' });
    expect(options(progress).copyLink).toBe(false);
  });

  it('allows deleting attachment-only messages but not deleted ones', () => {
    const attachmentOnly = mountMessage({
      content: null,
      attachments: [{ fileType: 'image' }],
    });
    expect(options(attachmentOnly)).toMatchObject({
      copy: false,
      delete: true,
    });

    const deleted = mountMessage({
      messageType: OUTGOING,
      contentAttributes: { deleted: true },
      isEmailInbox: true,
    });
    expect(options(deleted)).toMatchObject({
      delete: false,
      cannedResponse: false,
      translate: false,
      forwardEmail: false,
    });

    const empty = mountMessage({ content: null, status: 'failed' });
    expect(options(empty).delete).toBe(false);
  });

  it('offers forwarding in email inboxes and reporting captain replies on cloud', () => {
    const email = mountMessage({ isEmailInbox: true, private: false });
    expect(options(email).forwardEmail).toBe(true);

    const captain = mountMessage(
      { messageType: OUTGOING, sender: { id: 1, type: 'captain_assistant' } },
      { cloud: true }
    );
    expect(options(captain).report).toBe(true);
    const deletedCaptain = mountMessage(
      {
        messageType: OUTGOING,
        sender: { id: 1, type: 'captain_assistant' },
        contentAttributes: { deleted: true },
      },
      { cloud: true }
    );
    expect(options(deletedCaptain).report).toBe(false);
  });

  it('hides translate once the message was auto translated', () => {
    state.translation = 'Bonjour';
    const wrapper = shallowMount(Message, {
      props: baseProps,
    });
    // getters are set by mountMessage; reuse them with a language set.
    wrapper.unmount();
    state.getters.getAutoTranslate = { language: 'fr' };
    const translated = shallowMount(Message, {
      props: baseProps,
    });
    expect(options(translated).translate).toBe(false);
    expect(menu(translated).props('message').content).toBe('Bonjour');
    expect(ctx().showingOriginal.value).toBe(false);
  });

  it('treats a pending translation as auto translated', () => {
    state.getters = {
      'inboxes/getInbox': () => null,
      'globalConfig/isOnChatwootCloud': false,
      getAutoTranslate: { language: 'fr' },
      getMessageTranslationState: () => ({ pending: true }),
    };
    const wrapper = shallowMount(Message, {
      props: baseProps,
    });
    expect(options(wrapper).translate).toBe(false);
    expect(menu(wrapper).props('message').content).toBe('Hello');
  });

  it('shows the original content when toggled', async () => {
    state.translation = 'Bonjour';
    const wrapper = mountMessage();
    expect(menu(wrapper).props('message').content).toBe('Bonjour');
    ctx().showingOriginal.value = true;
    await wrapper.vm.$nextTick();
    expect(menu(wrapper).props('message').content).toBe('Hello');
  });

  it('opens on right click at the cursor and tracks the event', async () => {
    const wrapper = mountMessage();
    const bubble = wrapper.find('.\\[grid-area\\:bubble\\]');
    await bubble.trigger('contextmenu', { clientX: 10, clientY: 20 });
    expect(useTrack).toHaveBeenCalledTimes(1);
    expect(menu(wrapper).props('isOpen')).toBe(true);
    expect(menu(wrapper).props('contextMenuPosition')).toEqual({
      x: 10,
      y: 20,
    });

    await menu(wrapper).vm.$emit('close');
    expect(menu(wrapper).props('isOpen')).toBe(false);
    expect(menu(wrapper).props('contextMenuPosition')).toEqual({
      x: null,
      y: null,
    });
  });

  it('prefers page coordinates when the event has them', async () => {
    const wrapper = mountMessage();
    await menu(wrapper).vm.$emit('open', {
      type: 'click',
      target: document.createElement('div'),
      pageX: 5,
      pageY: 6,
      preventDefault: vi.fn(),
    });
    expect(menu(wrapper).props('contextMenuPosition')).toEqual({ x: 5, y: 6 });
  });

  it('opens from the menu button using client coordinates without tracking', async () => {
    const wrapper = mountMessage();
    const event = {
      type: 'click',
      target: document.createElement('button'),
      clientX: 3,
      clientY: 4,
      preventDefault: vi.fn(),
    };
    await menu(wrapper).vm.$emit('open', event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(useTrack).not.toHaveBeenCalled();
    expect(menu(wrapper).props('contextMenuPosition')).toEqual({ x: 3, y: 4 });
  });

  it('skips links, images, opted-out targets and text selections', async () => {
    const wrapper = mountMessage();
    const open = target =>
      menu(wrapper).vm.$emit('open', {
        type: 'contextmenu',
        target,
        preventDefault: vi.fn(),
      });

    const skip = document.createElement('span');
    skip.classList.add('skip-context-menu');
    await open(skip);
    await open(document.createElement('a'));
    await open(document.createElement('img'));
    const selection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ toString: () => 'picked' });
    await open(document.createElement('span'));
    selection.mockRestore();
    expect(menu(wrapper).props('isOpen')).toBe(false);

    await open(undefined);
    expect(menu(wrapper).props('isOpen')).toBe(true);
  });

  it('stores and broadcasts reply-to selections', async () => {
    const wrapper = mountMessage();
    await menu(wrapper).vm.$emit('replyTo');
    expect(LocalStorage.updateJsonStore).toHaveBeenCalledWith(
      LOCAL_STORAGE_KEYS.MESSAGE_REPLY_TO,
      3,
      7
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE,
      expect.objectContaining({ id: 7, conversationId: 3 })
    );
  });

  it('opens the forward panel at the menu position and closes it', async () => {
    const wrapper = mountMessage({ isEmailInbox: true });
    await wrapper
      .find('.\\[grid-area\\:bubble\\]')
      .trigger('contextmenu', { clientX: 30, clientY: 40 });
    await menu(wrapper).vm.$emit('forwardEmail');
    const panel = wrapper.findComponent(ForwardEmailPanel);
    expect(panel.props()).toMatchObject({ x: 30, y: 40 });
    await panel.vm.$emit('close');
    expect(wrapper.findComponent(ForwardEmailPanel).exists()).toBe(false);
  });
});

describe('Message tooltip and highlight', () => {
  it('builds the sender tooltip, echo advisory and empty tooltip', () => {
    const tooltips = [];
    const directives = {
      tooltip: { mounted: (el, binding) => tooltips.push(binding.value) },
    };
    const mountWith = props => {
      state.getters = {
        'inboxes/getInbox': () => null,
        'globalConfig/isOnChatwootCloud': false,
        getAutoTranslate: { language: '' },
        getMessageTranslationState: () => ({ pending: false }),
      };
      shallowMount(Message, {
        props: { ...baseProps, messageType: OUTGOING, ...props },
        global: { directives },
      });
    };
    mountWith({ sender: { id: 1, type: 'User', name: 'Ann' } });
    mountWith({
      sender: agentSender,
      contentAttributes: { externalEcho: true },
    });
    mountWith({ sender: { id: 1, type: 'User' } });
    expect(tooltips).toEqual([
      'CONVERSATION.SENT_BY Ann',
      '[CONVERSATION.NATIVE_APP_ADVISORY]',
      '',
    ]);
  });

  it('highlights the message linked from the route for one second', async () => {
    state.route = { query: { messageId: '7' } };
    const wrapper = mountMessage();
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('bg-n-alpha-1');
    expect(state.timeouts[0].ms).toBe(1000);
    state.timeouts[0].fn();
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('bg-n-alpha-1');
  });

  it('does not highlight other messages', () => {
    state.route = { query: { messageId: '8' } };
    const wrapper = mountMessage();
    expect(wrapper.classes()).not.toContain('bg-n-alpha-1');
    expect(state.timeouts).toHaveLength(0);
  });
});
