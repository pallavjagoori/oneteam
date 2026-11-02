/**
 * OneTeam behaviour spec for the conversation header call button.
 *
 * Covers when the button shows (voice-enabled Twilio/WhatsApp inbox and
 * the voice feature), disabled and loading states (active or incoming
 * call, initiating), tooltips, starting Twilio calls (payload, fallback
 * conversation id, failures, double clicks) and WhatsApp calls (locked,
 * permission pending/requested banners, success, failures, double clicks).
 */
import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import ConversationCallButton from '../ConversationCallButton.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: () => computed(() => env.uiFlags.value),
}));
vi.mock('dashboard/stores/calls', () => ({ useCallsStore: () => env.calls }));
vi.mock('dashboard/composables/useWhatsappCallSession', () => ({
  useWhatsappCallSession: () => env.session,
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isCloudFeatureEnabled: () => env.voice }),
}));

const NextButton = {
  name: 'NextButton',
  props: { isLoading: Boolean, disabled: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

const twilio = { id: 3, channel_type: 'Channel::TwilioSms', voice_enabled: true };
const whatsapp = { id: 4, channel_type: 'Channel::Whatsapp', voice_enabled: true };
const chat = { id: 50, meta: { sender: { id: 77 } } };

const mountButton = (inbox, chatProp = chat) =>
  mount(ConversationCallButton, {
    props: { inbox, chat: chatProp },
    global: {
      stubs: { NextButton },
      directives: {
        tooltip: { mounted: (el, binding) => { env.tooltip = binding.value; } },
      },
    },
  });
const click = async wrapper => {
  await wrapper.find('button').trigger('click');
  await flushPromises();
};

describe('Conversation call button behaviour', () => {
  beforeEach(() => {
    env.voice = true;
    env.uiFlags = ref({});
    env.dispatch = vi.fn().mockResolvedValue({ call_sid: 'CA1', conversation_id: 51 });
    env.calls = { hasActiveCall: false, hasIncomingCall: false, addCall: vi.fn() };
    env.session = {
      isInitiating: ref(false),
      initiateOutboundCall: vi.fn().mockResolvedValue({ id: 9, call_id: 'wa-1' }),
    };
  });

  it('hides without a voice inbox or the voice feature', () => {
    expect(mountButton({ channel_type: 'Channel::Api' }).find('button').exists()).toBe(false);
    env.voice = false;
    expect(mountButton(twilio).find('button').exists()).toBe(false);
  });

  it('starts a Twilio call', async () => {
    const wrapper = mountButton(twilio);
    expect(env.tooltip).toBe('CONVERSATION.HEADER.VOICE_CALL');
    expect(wrapper.findComponent(NextButton).props()).toEqual({ isLoading: false, disabled: false });
    await click(wrapper);
    expect(env.dispatch).toHaveBeenCalledWith('contacts/initiateCall', {
      contactId: 77,
      inboxId: 3,
      conversationId: 50,
    });
    expect(env.calls.addCall).toHaveBeenCalledWith({
      callSid: 'CA1',
      conversationId: 51,
      inboxId: 3,
      callDirection: 'outbound',
    });
  });

  it('falls back to the chat id and reports Twilio failures', async () => {
    env.dispatch.mockResolvedValueOnce(undefined);
    const wrapper = mountButton(twilio, { id: 60 });
    await click(wrapper);
    expect(env.calls.addCall).toHaveBeenCalledWith(expect.objectContaining({ callSid: undefined, conversationId: 60 }));
    env.dispatch.mockRejectedValueOnce(new Error('No credit'));
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('No credit');
    env.dispatch.mockRejectedValueOnce({});
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('CONVERSATION.HEADER.VOICE_CALL_FAILED');
  });

  it('ignores Twilio clicks while a call is being placed', async () => {
    env.uiFlags.value = { isInitiatingCall: true };
    const wrapper = mountButton(twilio);
    expect(wrapper.findComponent(NextButton).props()).toEqual({ isLoading: true, disabled: true });
    await click(wrapper);
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('disables the button during an active or incoming call', () => {
    env.calls.hasIncomingCall = true;
    expect(mountButton(twilio).findComponent(NextButton).props('disabled')).toBe(true);
  });

  it('starts a WhatsApp call', async () => {
    const wrapper = mountButton(whatsapp);
    expect(env.tooltip).toBe('CONVERSATION.HEADER.WHATSAPP_CALL');
    await click(wrapper);
    expect(env.session.initiateOutboundCall).toHaveBeenCalledWith({ conversationId: 50 });
    expect(env.calls.addCall).toHaveBeenCalledWith({
      callSid: 'wa-1',
      callId: 9,
      conversationId: 50,
      inboxId: 4,
      callDirection: 'outbound',
      provider: 'whatsapp',
    });
  });

  it('handles locked calls and permission requests', async () => {
    const wrapper = mountButton(whatsapp);
    env.session.initiateOutboundCall
      .mockResolvedValueOnce({ status: 'locked' })
      .mockResolvedValueOnce({ status: 'permission_pending' })
      .mockResolvedValueOnce(null);
    await click(wrapper);
    expect(useAlert).not.toHaveBeenCalled();
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('CONVERSATION.HEADER.WHATSAPP_CALL_PERMISSION_PENDING');
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('CONVERSATION.HEADER.WHATSAPP_CALL_PERMISSION_REQUESTED');
    expect(env.calls.addCall).not.toHaveBeenCalled();
  });

  it('reports WhatsApp failures and ignores clicks while initiating', async () => {
    const wrapper = mountButton(whatsapp);
    env.session.initiateOutboundCall
      .mockRejectedValueOnce(new Error('Window closed'))
      .mockRejectedValueOnce(undefined);
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Window closed');
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('CONVERSATION.HEADER.WHATSAPP_CALL_FAILED');
    env.session.isInitiating.value = true;
    await flushPromises();
    expect(wrapper.findComponent(NextButton).props()).toEqual({ isLoading: true, disabled: true });
    await click(wrapper);
    expect(env.session.initiateOutboundCall).toHaveBeenCalledTimes(2);
  });
});
