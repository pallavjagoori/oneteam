/**
 * OneTeam behaviour spec for the floating voice call widget.
 *
 * The call session, Vuex getters, Twilio and WhatsApp mute helpers,
 * window visibility and `Audio` are faked. Covers the main and stacked
 * call cards, caller details (name, phone, location, flag, inbox),
 * joining, rejecting, dismissing and ending calls, muting per provider,
 * auto-joining outbound Twilio calls, and the ringtone.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import FloatingCallWidget from '../FloatingCallWidget.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => env.store,
}));
vi.mock('dashboard/composables/useCallSession', () => ({
  useCallSession: () => env.session,
}));
vi.mock('dashboard/composables/useWhatsappCallSession', () => ({
  setWhatsappCallMuted: (...args) => env.waMute(...args),
}));
vi.mock('dashboard/api/channel/voice/twilioVoiceClient', () => ({
  default: { setMuted: (...args) => env.twilioMute(...args) },
}));
vi.mock('dashboard/helper/AudioAlerts/WindowVisibilityHelper', () => ({
  default: { isWindowVisible: () => env.visible },
}));

class FakeAudio {
  constructor(src) {
    this.src = src;
    env.audio = this;
    this.play = vi.fn(() => env.playResult);
    this.pause = vi.fn();
  }
}

const CallCard = {
  name: 'CallCard',
  props: ['call', 'state', 'callInfo', 'duration', 'isMuted', 'showMute'],
  emits: [
    'accept',
    'reject',
    'dismiss',
    'end',
    'toggleMute',
    'goToConversation',
  ],
  template: '<div class="card" />',
};

const call = (sid, extra = {}) => ({
  callSid: sid,
  conversationId: 5,
  inboxId: 2,
  callDirection: 'inbound',
  provider: 'twilio',
  ...extra,
});

const mountWidget = async () => {
  const wrapper = mount(FloatingCallWidget, {
    global: { stubs: { CallCard } },
  });
  await flushPromises();
  return wrapper;
};

const cards = wrapper => wrapper.findAllComponents(CallCard);
const main = wrapper => cards(wrapper).at(-1);

describe('FloatingCallWidget behaviour', () => {
  beforeEach(() => {
    env.route = { params: { accountId: '1' } };
    env.router = { push: vi.fn() };
    env.visible = true;
    env.playResult = Promise.resolve();
    env.waMute = vi.fn();
    env.twilioMute = vi.fn();
    env.conversations = {
      5: {
        inbox_id: 2,
        meta: {
          sender: {
            name: 'Sam',
            phone_number: '+15550001',
            thumbnail: 's.png',
            additional_attributes: { city: 'Austin', country_code: 'us' },
          },
        },
      },
    };
    env.store = {
      getters: {
        getConversationById: id => env.conversations[id],
        'inboxes/getInbox': id =>
          id === 2 ? { name: 'Support line' } : undefined,
      },
    };
    env.session = {
      activeCall: ref(null),
      incomingCalls: ref([]),
      hasActiveCall: ref(false),
      isJoining: ref(false),
      joinCall: vi.fn(() => Promise.resolve(true)),
      endCall: vi.fn(() => Promise.resolve()),
      rejectIncomingCall: vi.fn(),
      dismissCall: vi.fn(),
      formattedCallDuration: ref('01:02'),
    };
    vi.stubGlobal('Audio', FakeAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing without calls and keeps the ringtone off', async () => {
    const wrapper = await mountWidget();
    expect(cards(wrapper)).toHaveLength(0);
    expect(env.audio.src).toBe('/audio/dashboard/ringtone.mp3');
    expect(env.audio.loop).toBe(true);
    expect(env.audio.pause).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('rings for an incoming call and shows caller details', async () => {
    env.session.incomingCalls.value = [call('a')];
    const wrapper = await mountWidget();
    expect(env.audio.play).toHaveBeenCalled();
    expect(cards(wrapper)).toHaveLength(1);
    expect(main(wrapper).props()).toMatchObject({
      state: 'incoming',
      duration: '',
      showMute: false,
      isMuted: false,
    });
    expect(main(wrapper).props('callInfo')).toMatchObject({
      contactName: 'Sam',
      phoneNumber: '+15550001',
      inboxName: 'Support line',
      location: 'Austin, United States',
      countryFlag: '🇺🇸',
      hasLocation: true,
      avatar: 's.png',
    });
  });

  it('ignores a rejected autoplay', async () => {
    env.playResult = Promise.reject(new Error('autoplay'));
    env.session.incomingCalls.value = [call('a')];
    await mountWidget();
    expect(env.audio.play).toHaveBeenCalled();
  });

  it('prefers the caller snapshot and falls back step by step', async () => {
    env.session.incomingCalls.value = [
      call('a', {
        conversationId: 99,
        inboxId: 7,
        caller: {
          name: 'Snap',
          phone: '+44',
          avatar: 'c.png',
          additionalAttributes: { country: 'Wonderland', country_code: 'X' },
        },
      }),
    ];
    let wrapper = await mountWidget();
    expect(main(wrapper).props('callInfo')).toMatchObject({
      contactName: 'Snap',
      phoneNumber: '+44',
      inboxName: 'Customer support',
      location: 'Wonderland',
      countryFlag: '',
      avatar: 'c.png',
    });

    env.session.incomingCalls.value = [
      call('b', { caller: { phone: '+33' }, inboxId: 2, conversationId: 99 }),
    ];
    wrapper = await mountWidget();
    expect(main(wrapper).props('callInfo')).toMatchObject({
      contactName: '+33',
      location: 'Support line',
      hasLocation: false,
    });

    env.conversations[6] = {
      meta: { sender: { phone_number: '+1', avatar: 'av' } },
    };
    env.session.incomingCalls.value = [
      call('c', { conversationId: 6, inboxId: 7 }),
    ];
    wrapper = await mountWidget();
    expect(main(wrapper).props('callInfo')).toMatchObject({
      contactName: '+1',
      phoneNumber: '+1',
      location: 'Customer support',
      avatar: 'av',
    });

    env.session.incomingCalls.value = [call('d', { conversationId: 98 })];
    wrapper = await mountWidget();
    expect(main(wrapper).props('callInfo')).toMatchObject({
      contactName: 'Unknown caller',
      phoneNumber: '',
    });
  });

  it('stacks extra incoming calls above the main card', async () => {
    env.session.incomingCalls.value = [
      call('a'),
      call('b', { callDirection: 'outbound' }),
      call('c'),
    ];
    const wrapper = await mountWidget();
    expect(cards(wrapper).map(c => c.props('call').callSid)).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(cards(wrapper).map(c => c.props('state'))).toEqual([
      'outgoing',
      'incoming',
      'incoming',
    ]);
    cards(wrapper)[0].vm.$emit('reject');
    cards(wrapper)[1].vm.$emit('dismiss');
    expect(env.session.rejectIncomingCall).toHaveBeenCalledWith('b');
    expect(env.session.dismissCall).toHaveBeenCalledWith('c');
    main(wrapper).vm.$emit('reject');
    main(wrapper).vm.$emit('dismiss');
    expect(env.session.rejectIncomingCall).toHaveBeenLastCalledWith('a');
    expect(env.session.dismissCall).toHaveBeenLastCalledWith('a');
  });

  it('joins a call and opens its conversation', async () => {
    env.session.incomingCalls.value = [call('a', { inboxId: undefined })];
    const wrapper = await mountWidget();
    main(wrapper).vm.$emit('accept');
    await flushPromises();
    expect(env.session.joinCall).toHaveBeenCalledWith({
      conversationId: 5,
      inboxId: 2,
      callSid: 'a',
    });
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'inbox_conversation',
      params: { conversation_id: 5 },
    });
  });

  it('does not navigate when joining fails or the conversation is unknown', async () => {
    env.session.joinCall.mockResolvedValueOnce(false);
    env.session.incomingCalls.value = [
      call('a'),
      call('b', { conversationId: 77 }),
    ];
    const wrapper = await mountWidget();
    main(wrapper).vm.$emit('accept');
    await flushPromises();
    cards(wrapper)[0].vm.$emit('accept');
    await flushPromises();
    expect(env.session.joinCall).toHaveBeenCalledWith({
      conversationId: 77,
      inboxId: 2,
      callSid: 'b',
    });
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('ignores accept while already joining', async () => {
    env.session.isJoining.value = true;
    env.session.incomingCalls.value = [call('a')];
    const wrapper = await mountWidget();
    main(wrapper).vm.$emit('accept');
    await flushPromises();
    expect(env.session.joinCall).not.toHaveBeenCalled();
  });

  it('shows the active call with duration, mute and a stacked ringing call', async () => {
    env.session.hasActiveCall.value = true;
    env.session.activeCall.value = call('live');
    env.session.incomingCalls.value = [call('ring')];
    const wrapper = await mountWidget();
    expect(env.audio.play).not.toHaveBeenCalled();
    expect(cards(wrapper).map(c => c.props('call').callSid)).toEqual([
      'ring',
      'live',
    ]);
    expect(main(wrapper).props()).toMatchObject({
      state: 'ongoing',
      duration: '01:02',
      showMute: true,
    });

    // Accepting the ringing call ends the live one first.
    cards(wrapper)[0].vm.$emit('accept');
    await flushPromises();
    expect(env.session.endCall).toHaveBeenCalledWith({
      conversationId: 5,
      inboxId: 2,
      callSid: 'live',
    });
    expect(env.session.joinCall).toHaveBeenCalledWith(
      expect.objectContaining({ callSid: 'ring' })
    );
  });

  it('mutes Twilio and WhatsApp calls through their own helpers', async () => {
    env.session.hasActiveCall.value = true;
    env.session.activeCall.value = call('live');
    const wrapper = await mountWidget();
    main(wrapper).vm.$emit('toggleMute');
    await flushPromises();
    expect(env.twilioMute).toHaveBeenCalledWith(true);
    expect(main(wrapper).props('isMuted')).toBe(true);

    env.session.activeCall.value = call('wa', { provider: 'whatsapp' });
    main(wrapper).vm.$emit('toggleMute');
    expect(env.waMute).toHaveBeenCalledWith(false);
    main(wrapper).vm.$emit('toggleMute');
    await flushPromises();
    expect(main(wrapper).props('isMuted')).toBe(true);

    // Ending the call resets mute.
    env.session.hasActiveCall.value = false;
    env.session.activeCall.value = null;
    env.session.incomingCalls.value = [call('next')];
    await flushPromises();
    expect(main(wrapper).props('isMuted')).toBe(false);
    env.session.hasActiveCall.value = true;
    await flushPromises();
    env.session.hasActiveCall.value = true;
  });

  it('ends the active call using the conversation inbox when needed', async () => {
    env.session.hasActiveCall.value = true;
    env.session.activeCall.value = call('live', { inboxId: undefined });
    const wrapper = await mountWidget();
    main(wrapper).vm.$emit('end');
    await flushPromises();
    expect(env.session.endCall).toHaveBeenCalledWith({
      conversationId: 5,
      inboxId: 2,
      callSid: 'live',
    });

    env.session.endCall.mockClear();
    env.session.activeCall.value = call('lost', {
      inboxId: undefined,
      conversationId: 404,
    });
    main(wrapper).vm.$emit('end');
    await flushPromises();
    expect(env.session.endCall).not.toHaveBeenCalled();
  });

  it('opens the conversation from a card when the account is known', async () => {
    env.session.incomingCalls.value = [
      call('a'),
      call('b', { conversationId: null }),
    ];
    const wrapper = await mountWidget();
    main(wrapper).vm.$emit('goToConversation');
    expect(env.router.push).toHaveBeenCalledWith({
      path: '/app/accounts/1/conversations/5',
    });
    cards(wrapper)[0].vm.$emit('goToConversation');
    expect(env.router.push).toHaveBeenCalledTimes(1);
    env.route = { params: {} };
  });

  it('skips navigation without an account id', async () => {
    env.route = { params: {} };
    env.session.incomingCalls.value = [call('a')];
    const wrapper = await mountWidget();
    main(wrapper).vm.$emit('goToConversation');
    expect(env.router.push).not.toHaveBeenCalled();
  });

  it('auto-joins outbound Twilio calls only when visible and idle', async () => {
    env.session.incomingCalls.value = [
      call('out', { callDirection: 'outbound' }),
    ];
    let wrapper = await mountWidget();
    expect(env.session.joinCall).toHaveBeenCalledWith(
      expect.objectContaining({ callSid: 'out' })
    );
    expect(main(wrapper).props('state')).toBe('outgoing');
    expect(env.audio.play).not.toHaveBeenCalled();

    env.session.joinCall.mockClear();
    env.visible = false;
    wrapper = await mountWidget();
    expect(env.session.joinCall).not.toHaveBeenCalled();

    env.visible = true;
    env.session.incomingCalls.value = [
      call('wa', { callDirection: 'outbound', provider: 'whatsapp' }),
    ];
    wrapper = await mountWidget();
    expect(env.session.joinCall).not.toHaveBeenCalled();

    env.session.hasActiveCall.value = true;
    env.session.activeCall.value = call('live');
    env.session.incomingCalls.value = [
      call('out2', { callDirection: 'outbound' }),
    ];
    wrapper = await mountWidget();
    expect(env.session.joinCall).not.toHaveBeenCalled();
    expect(wrapper.exists()).toBe(true);
  });

  it('stops ringing when the incoming call goes away', async () => {
    env.session.incomingCalls.value = [call('a')];
    await mountWidget();
    env.audio.pause.mockClear();
    env.session.incomingCalls.value = [];
    await flushPromises();
    expect(env.audio.pause).toHaveBeenCalled();
    expect(env.audio.currentTime).toBe(0);
  });
});
