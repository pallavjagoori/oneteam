/**
 * OneTeam behaviour spec for the voice call message bubble.
 *
 * The message context, call session composables and calls store are
 * replaced with plain refs so each call status, direction and provider can
 * be rendered, and the join / call-back buttons driven.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import VoiceCall from '../VoiceCall.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
  }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('vuex', async importOriginal => ({
  ...(await importOriginal()),
  useStore: () => env.store,
}));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return { useMapGetter: () => computed(() => env.contactsUi) };
});
vi.mock('../../provider.js', () => ({
  useMessageContext: () => env.context,
}));
vi.mock('dashboard/composables/useCallSession', () => ({
  useCallActions: () => env.actions,
}));
vi.mock('dashboard/composables/useWhatsappCallSession', () => ({
  useWhatsappCallSession: () => env.whatsapp,
}));
vi.mock('dashboard/stores/calls', () => ({
  useCallsStore: () => env.callsStore,
}));

const { useAlert } = await import('dashboard/composables');

const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled'],
  emits: ['click'],
  template: '<button />',
};
const AudioChip = {
  name: 'AudioChip',
  props: ['attachment'],
  template: '<audio />',
};

const setup = ({
  call = {},
  messageType = 0,
  attachments = [],
  contentAttributes = {},
  sender = { id: 3, phoneNumber: '+1555' },
  assignee = null,
  agents = {},
} = {}) => {
  env.context = {
    call: ref(call),
    attachments: ref(attachments),
    contentAttributes: ref(contentAttributes),
    conversationId: ref(10),
    currentUserId: ref(1),
    inboxId: ref(20),
    sender: ref(sender),
    messageType: ref(messageType),
  };
  env.store = {
    getters: {
      getConversationById: () => (assignee ? { meta: { assignee } } : {}),
      'agents/getAgentById': id => agents[id],
    },
    dispatch: vi.fn(async () => env.initiateResult()),
  };
};

const mountBubble = () =>
  mount(VoiceCall, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        BaseBubble: { template: '<div><slot /></div>' },
        Icon: { props: ['icon'], template: '<i :data-icon="icon" />' },
        AudioChip,
        NextButton,
      },
    },
  });

const label = wrapper => wrapper.find('span.font-display').text();
const subtext = wrapper => wrapper.find('span.opacity-75');
const icon = wrapper => wrapper.find('i').attributes('data-icon');
const button = (wrapper, key) =>
  wrapper
    .findAllComponents(NextButton)
    .find(b => b.props('label') === `CONVERSATION.VOICE_CALL.${key}`);

beforeEach(() => {
  env.contactsUi = {};
  env.actions = {
    joinCall: vi.fn(),
    endCall: vi.fn(),
    activeCall: ref(null),
    hasActiveCall: ref(false),
    isJoining: ref(false),
  };
  env.whatsapp = { initiateOutboundCall: vi.fn() };
  env.callsStore = { addCall: vi.fn(), hasIncomingCall: false };
  env.initiateResult = () => ({ call_sid: 'CA2', conversation_id: 11 });
  vi.clearAllMocks();
});

describe('VoiceCall labels', () => {
  it('shows a completed call with handler and duration', () => {
    setup({
      call: {
        status: 'completed',
        acceptedByAgentName: 'Ann',
        durationSeconds: 42,
      },
    });
    const wrapper = mountBubble();
    expect(label(wrapper)).toBe('CONVERSATION.VOICE_CALL.CALL_ENDED');
    expect(subtext(wrapper).text()).toBe(
      'CONVERSATION.VOICE_CALL.HANDLED_BY:{"agentName":"Ann"} · 00:42'
    );
    expect(icon(wrapper)).toBe('i-ph-phone-bold');
    expect(wrapper.find('.bg-n-alpha-2.text-n-slate-12').exists()).toBe(true);
  });

  it('reads the duration from snake case and content attributes', () => {
    setup({ call: { status: 'completed', duration_seconds: 5 } });
    expect(subtext(mountBubble()).text()).toBe('00:05');
    setup({
      call: { status: 'completed' },
      contentAttributes: { data: { durationSeconds: 7 } },
    });
    expect(subtext(mountBubble()).text()).toBe('00:07');
    setup({
      call: { status: 'completed' },
      contentAttributes: { data: { duration_seconds: 8 } },
    });
    expect(subtext(mountBubble()).text()).toBe('00:08');
    setup({ call: { status: 'completed' }, contentAttributes: null });
    expect(subtext(mountBubble()).exists()).toBe(false);
  });

  it('names the handler from the agent list', () => {
    setup({
      call: { status: 'in-progress', acceptedByAgentId: 4 },
      agents: { 4: { available_name: 'Avi', name: 'Avinash' } },
    });
    const wrapper = mountBubble();
    expect(label(wrapper)).toBe('CONVERSATION.VOICE_CALL.CALL_IN_PROGRESS');
    expect(subtext(wrapper).text()).toContain('Avi');
    expect(wrapper.find('.bg-n-teal-3').exists()).toBe(true);

    setup({
      call: { status: 'in-progress', acceptedByAgentId: 4 },
      agents: { 4: { name: 'Avinash' } },
    });
    expect(subtext(mountBubble()).text()).toContain('Avinash');

    setup({ call: { status: 'in-progress', acceptedByAgentId: 4 } });
    expect(subtext(mountBubble()).exists()).toBe(false);
  });

  it.each([
    [
      { direction: 'outgoing' },
      'OUTGOING_CALL',
      'CALLING',
      'i-ph-phone-outgoing-bold',
    ],
    [
      { direction: 'outbound', acceptedByAgentName: 'Ann' },
      'OUTGOING_CALL',
      'HANDLED_BY',
      'i-ph-phone-outgoing-bold',
    ],
    [
      { direction: 'incoming' },
      'INCOMING_CALL',
      'NOT_ANSWERED_YET',
      'i-ph-phone-incoming-bold',
    ],
    [
      { direction: 'inbound', status: 'ringing' },
      'INCOMING_CALL',
      'NOT_ANSWERED_YET',
      'i-ph-phone-incoming-bold',
    ],
  ])('labels an unanswered call %o', (call, key, sub, iconName) => {
    setup({ call });
    const wrapper = mountBubble();
    expect(label(wrapper)).toBe(`CONVERSATION.VOICE_CALL.${key}`);
    expect(subtext(wrapper).text()).toContain(sub);
    expect(icon(wrapper)).toBe(iconName);
  });

  it('falls back to the message side without a direction', () => {
    setup({ call: { status: 'ringing' }, messageType: 1 });
    expect(label(mountBubble())).toBe('CONVERSATION.VOICE_CALL.OUTGOING_CALL');
    setup({ call: null });
    expect(label(mountBubble())).toBe('CONVERSATION.VOICE_CALL.INCOMING_CALL');
  });

  it.each([
    [
      { status: 'no-answer', direction: 'outgoing' },
      'NO_ANSWER_OUTBOUND_LABEL',
      'NO_ANSWER_OUTBOUND_SUBTEXT',
    ],
    [
      { status: 'failed', direction: 'incoming' },
      'MISSED_CALL',
      'MISSED_CALL_INBOUND_SUBTEXT',
    ],
    [
      {
        status: 'rejected',
        direction: 'incoming',
        endReason: 'outside_working_hours',
      },
      'MISSED_CALL',
      'MISSED_CALL_OUTSIDE_HOURS',
    ],
    [
      {
        status: 'rejected',
        direction: 'incoming',
        endReason: 'agent_rejected',
        acceptedByAgentName: 'Ann',
      },
      'MISSED_CALL',
      'MISSED_CALL_DECLINED_BY',
    ],
    [
      {
        status: 'rejected',
        direction: 'incoming',
        endReason: 'agent_rejected',
      },
      'MISSED_CALL',
      'MISSED_CALL_INBOUND_SUBTEXT',
    ],
  ])('labels a failed call %o', (call, key, sub) => {
    setup({ call });
    const wrapper = mountBubble();
    expect(label(wrapper)).toBe(`CONVERSATION.VOICE_CALL.${key}`);
    expect(subtext(wrapper).text()).toContain(sub);
    expect(icon(wrapper)).toBe('i-ph-phone-x-bold');
  });

  it('names the agent who declined from the agent list or the assignee', () => {
    const declined = {
      status: 'rejected',
      direction: 'incoming',
      endReason: 'agent_rejected',
    };
    setup({
      call: { ...declined, acceptedByAgentId: 4 },
      agents: { 4: { available_name: 'Avi' } },
    });
    expect(subtext(mountBubble()).text()).toContain('Avi');
    setup({
      call: { ...declined, acceptedByAgentId: 4 },
      agents: { 4: { name: 'Avinash' } },
    });
    expect(subtext(mountBubble()).text()).toContain('Avinash');
    setup({
      call: { ...declined, acceptedByAgentId: 4 },
      assignee: { id: 5, name: 'Sam' },
    });
    expect(subtext(mountBubble()).text()).toContain('Sam');
  });

  it('marks missed inbound calls in red', () => {
    setup({ call: { status: 'failed', direction: 'incoming' } });
    expect(mountBubble().find('.text-n-ruby-9').exists()).toBe(true);
  });
});

describe('VoiceCall recordings', () => {
  it('prefers an audio attachment', () => {
    const audio = { fileType: 'audio', dataUrl: 'a.mp3' };
    setup({
      call: { status: 'completed', recordingUrl: 'r.wav' },
      attachments: [{ fileType: 'image' }, audio],
    });
    expect(mountBubble().findComponent(AudioChip).props('attachment')).toEqual(
      audio
    );
  });

  it('falls back to the call recording URL', () => {
    setup({
      call: { status: 'completed', recordingUrl: 'r.wav', transcript: 'hi' },
    });
    expect(mountBubble().findComponent(AudioChip).props('attachment')).toEqual({
      dataUrl: 'r.wav',
      fileType: 'audio',
      extension: 'wav',
      transcribedText: 'hi',
    });
    setup({ call: { status: 'completed', recordingUrl: 'r.wav' } });
    expect(
      mountBubble().findComponent(AudioChip).props('attachment').transcribedText
    ).toBe('');
  });

  it('has no player without a recording', () => {
    setup({ call: { status: 'completed' }, attachments: null });
    expect(mountBubble().findComponent(AudioChip).exists()).toBe(false);
  });
});

describe('VoiceCall join', () => {
  const ringing = {
    status: 'ringing',
    direction: 'incoming',
    providerCallId: 'CA1',
    id: 77,
    provider: 'twilio',
  };

  it('joins a ringing inbound call', async () => {
    setup({ call: ringing });
    const wrapper = mountBubble();
    await button(wrapper, 'JOIN_CALL').vm.$emit('click');
    await flushPromises();
    expect(env.actions.endCall).not.toHaveBeenCalled();
    expect(env.callsStore.addCall).toHaveBeenCalledWith({
      callSid: 'CA1',
      callId: 77,
      provider: 'twilio',
      conversationId: 10,
      inboxId: 20,
      callDirection: 'inbound',
    });
    expect(env.actions.joinCall).toHaveBeenCalledWith({
      conversationId: 10,
      inboxId: 20,
      callSid: 'CA1',
    });
  });

  it('ends another active call before joining', async () => {
    setup({ call: ringing, assignee: { id: 1 } });
    env.actions.hasActiveCall.value = true;
    env.actions.activeCall.value = {
      callSid: 'OTHER',
      conversationId: 2,
      inboxId: 3,
    };
    const wrapper = mountBubble();
    await button(wrapper, 'JOIN_CALL').vm.$emit('click');
    await flushPromises();
    expect(env.actions.endCall).toHaveBeenCalledWith({
      conversationId: 2,
      inboxId: 3,
      callSid: 'OTHER',
    });
  });

  it('ignores clicks while already joining', async () => {
    setup({ call: ringing });
    env.actions.isJoining.value = true;
    const wrapper = mountBubble();
    expect(button(wrapper, 'JOIN_CALL').props('disabled')).toBe(true);
    await button(wrapper, 'JOIN_CALL').vm.$emit('click');
    expect(env.actions.joinCall).not.toHaveBeenCalled();
  });

  it.each([
    ['not ringing', { ...ringing, status: 'in-progress' }, {}],
    ['outbound', { ...ringing, direction: 'outgoing' }, {}],
    ['already accepted', { ...ringing, acceptedByAgentId: 4 }, {}],
    ['no call id', { ...ringing, providerCallId: null }, {}],
    ['assigned elsewhere', ringing, { assignee: { id: 9 } }],
  ])('hides join when %s', (_, call, extra) => {
    setup({ call, ...extra });
    expect(button(mountBubble(), 'JOIN_CALL')).toBeUndefined();
  });

  it('hides join without an inbox or conversation', () => {
    setup({ call: ringing });
    env.context.inboxId.value = null;
    expect(button(mountBubble(), 'JOIN_CALL')).toBeUndefined();
    setup({ call: ringing });
    env.context.conversationId.value = null;
    expect(button(mountBubble(), 'JOIN_CALL')).toBeUndefined();
  });

  it('hides join while this call is already active', () => {
    setup({ call: ringing });
    env.actions.hasActiveCall.value = true;
    env.actions.activeCall.value = { callSid: 'CA1' };
    expect(button(mountBubble(), 'JOIN_CALL')).toBeUndefined();
  });
});

describe('VoiceCall call back', () => {
  const missed = { status: 'no-answer', direction: 'incoming' };

  it('calls back over Twilio', async () => {
    setup({ call: missed });
    const wrapper = mountBubble();
    await button(wrapper, 'CALL_BACK').vm.$emit('click');
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/initiateCall', {
      contactId: 3,
      inboxId: 20,
      conversationId: 10,
    });
    expect(env.callsStore.addCall).toHaveBeenCalledWith({
      callSid: 'CA2',
      conversationId: 11,
      inboxId: 20,
      callDirection: 'outbound',
    });
  });

  it('keeps the conversation when the API omits it', async () => {
    env.initiateResult = () => undefined;
    setup({ call: missed });
    const wrapper = mountBubble();
    await button(wrapper, 'CALL_BACK').vm.$emit('click');
    await flushPromises();
    expect(env.callsStore.addCall).toHaveBeenCalledWith(
      expect.objectContaining({ callSid: undefined, conversationId: 10 })
    );
  });

  it.each([
    [new Error('No credit'), 'No credit'],
    [{}, 'CONTACT_PANEL.CALL_FAILED'],
  ])('reports a failed call back', async (error, message) => {
    env.initiateResult = () => {
      throw error;
    };
    setup({ call: missed });
    const wrapper = mountBubble();
    await button(wrapper, 'CALL_BACK').vm.$emit('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(message);
  });

  it('calls back over WhatsApp and registers the call', async () => {
    env.whatsapp.initiateOutboundCall.mockResolvedValue({
      id: 5,
      call_id: 'wa1',
    });
    setup({ call: { ...missed, provider: 'whatsapp' }, sender: {} });
    const wrapper = mountBubble();
    await button(wrapper, 'CALL_BACK').vm.$emit('click');
    await flushPromises();
    expect(env.whatsapp.initiateOutboundCall).toHaveBeenCalledWith({
      conversationId: 10,
    });
    expect(env.callsStore.addCall).toHaveBeenCalledWith({
      callSid: 'wa1',
      callId: 5,
      conversationId: 10,
      inboxId: 20,
      callDirection: 'outbound',
      provider: 'whatsapp',
    });
  });

  it.each([
    [{ status: 'locked' }, null],
    [
      { status: 'permission_pending' },
      'CONVERSATION.HEADER.WHATSAPP_CALL_PERMISSION_PENDING',
    ],
    [
      { status: 'permission_requested' },
      'CONVERSATION.HEADER.WHATSAPP_CALL_PERMISSION_REQUESTED',
    ],
    [undefined, 'CONVERSATION.HEADER.WHATSAPP_CALL_PERMISSION_REQUESTED'],
  ])('handles WhatsApp response %o', async (response, message) => {
    env.whatsapp.initiateOutboundCall.mockResolvedValue(response);
    setup({ call: { ...missed, provider: 'whatsapp' } });
    const wrapper = mountBubble();
    await button(wrapper, 'CALL_BACK').vm.$emit('click');
    await flushPromises();
    expect(env.callsStore.addCall).not.toHaveBeenCalled();
    if (message) expect(useAlert).toHaveBeenCalledWith(message);
    else expect(useAlert).not.toHaveBeenCalled();
  });

  it('ignores clicks while a call is being started', async () => {
    env.contactsUi = { isInitiatingCall: true };
    setup({ call: missed });
    const wrapper = mountBubble();
    expect(button(wrapper, 'CALL_BACK').props('disabled')).toBe(true);
    await button(wrapper, 'CALL_BACK').vm.$emit('click');
    expect(env.store.dispatch).not.toHaveBeenCalled();
  });

  it.each([
    ['no phone number', { sender: {} }, () => {}],
    ['no sender', { sender: null }, () => {}],
    [
      'an active call',
      {},
      () => {
        env.actions.hasActiveCall.value = true;
      },
    ],
    [
      'an incoming call',
      {},
      () => {
        env.callsStore.hasIncomingCall = true;
      },
    ],
    [
      'no inbox',
      {},
      () => {
        env.context.inboxId.value = null;
      },
    ],
    [
      'no conversation',
      {},
      () => {
        env.context.conversationId.value = null;
      },
    ],
  ])('hides call back with %s', (_, extra, tweak) => {
    setup({ call: missed, ...extra });
    tweak();
    expect(button(mountBubble(), 'CALL_BACK')).toBeUndefined();
  });

  it('hides call back for outbound failures', () => {
    setup({ call: { ...missed, direction: 'outgoing' } });
    expect(button(mountBubble(), 'CALL_BACK')).toBeUndefined();
  });
});
