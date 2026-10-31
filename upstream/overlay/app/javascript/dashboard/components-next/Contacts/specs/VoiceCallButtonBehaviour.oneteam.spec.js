/**
 * OneTeam behaviour spec for the contact "call" button.
 *
 * Store, calls store, WhatsApp call session, route and router are
 * faked. Covers when the button shows, picking among several voice
 * inboxes, calling from a conversation's own voice inbox, Twilio and
 * WhatsApp calls (including permission requests and locked sessions),
 * navigation to the conversation, and error alerts.
 */
import { reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import VoiceCallButton from '../VoiceCallButton.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: key =>
    key === 'inboxes/getInboxes' ? env.inboxes : env.contactFlags,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/stores/calls', () => ({ useCallsStore: () => env.calls }));
vi.mock('dashboard/composables/useWhatsappCallSession', () => ({
  useWhatsappCallSession: () => env.whatsapp,
}));

const Button = {
  name: 'Button',
  props: ['disabled', 'isLoading', 'label'],
  emits: ['click'],
  template: '<button class="call">{{ label }}</button>',
};
const Dialog = {
  name: 'Dialog',
  methods: { open: () => env.dialogOpen(), close: () => env.dialogClose() },
  template: '<div class="picker"><slot /></div>',
};

const twilio = {
  id: 1,
  name: 'Phone',
  channel_type: 'Channel::TwilioSms',
  voice_enabled: true,
  phone_number: '+1555',
};
const whatsapp = {
  id: 2,
  name: 'WA',
  channel_type: 'Channel::Whatsapp',
  voice_enabled: true,
};
const email = { id: 3, name: 'Mail', channel_type: 'Channel::Email' };

const mountButton = (props = {}) =>
  mount(VoiceCallButton, {
    props: { contactId: 7, phone: '+1999', label: 'Call', ...props },
    attrs: { 'data-test': 'call' },
    global: { stubs: { Button, Dialog }, directives: { tooltip: {} } },
  });

const click = async wrapper => {
  await wrapper.findComponent(Button).vm.$emit('click');
  await flushPromises();
};

describe('VoiceCallButton behaviour', () => {
  beforeEach(() => {
    env.route = { params: { accountId: 1 } };
    env.router = { push: vi.fn() };
    env.inboxes = ref([twilio, email]);
    env.contactFlags = ref({});
    env.calls = reactive({
      hasActiveCall: false,
      hasIncomingCall: false,
      addCall: vi.fn(),
    });
    env.whatsapp = { initiateOutboundCall: vi.fn() };
    env.dialogOpen = vi.fn();
    env.dialogClose = vi.fn();
    env.store = {
      dispatch: vi
        .fn()
        .mockResolvedValue({ call_sid: 'CA1', conversation_id: 55 }),
      getters: {
        getConversationById: id =>
          ({ 55: { inbox_id: 2 }, 56: { inbox_id: 3 } })[id],
      },
    };
  });

  it('only shows with a voice inbox and a phone or WhatsApp conversation', () => {
    expect(mountButton().findComponent(Button).attributes('data-test')).toBe(
      'call'
    );
    expect(mountButton({ phone: '' }).findComponent(Button).exists()).toBe(
      false
    );
    env.inboxes.value = null;
    expect(mountButton().findComponent(Button).exists()).toBe(false);
    env.inboxes.value = [whatsapp];
    expect(
      mountButton({ phone: '', conversationId: 55 })
        .findComponent(Button)
        .exists()
    ).toBe(true);
    expect(
      mountButton({ phone: '', conversationId: 99 })
        .findComponent(Button)
        .exists()
    ).toBe(false);
  });

  it('disables the button during other calls', () => {
    env.calls.hasActiveCall = true;
    expect(mountButton().findComponent(Button).props('disabled')).toBe(true);
    env.calls.hasActiveCall = false;
    env.calls.hasIncomingCall = true;
    expect(mountButton().findComponent(Button).props('disabled')).toBe(true);
    env.calls.hasIncomingCall = false;
    env.contactFlags.value = { isInitiatingCall: true };
    expect(mountButton().findComponent(Button).props()).toMatchObject({
      disabled: true,
      isLoading: true,
    });
    env.contactFlags.value = null;
    expect(mountButton().findComponent(Button).props('disabled')).toBe(false);
  });

  it('places a Twilio call and opens the conversation', async () => {
    const wrapper = mountButton();
    await click(wrapper);
    expect(env.store.dispatch).toHaveBeenCalledWith('contacts/initiateCall', {
      contactId: 7,
      inboxId: 1,
      conversationId: null,
    });
    expect(env.calls.addCall).toHaveBeenCalledWith({
      callSid: 'CA1',
      conversationId: 55,
      inboxId: 1,
      callDirection: 'outbound',
    });
    expect(useAlert).toHaveBeenCalledWith('CONTACT_PANEL.CALL_INITIATED');
    expect(env.router.push).toHaveBeenCalledWith({
      path: '/app/accounts/1/conversations/55',
    });
  });

  it('skips navigation without an account or conversation and reports failures', async () => {
    env.route.params = {};
    let wrapper = mountButton();
    await click(wrapper);
    expect(env.router.push).not.toHaveBeenCalled();

    env.store.dispatch.mockRejectedValueOnce(new Error('Busy'));
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Busy');
    env.store.dispatch.mockRejectedValueOnce({});
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('CONTACT_PANEL.CALL_FAILED');

    env.calls.hasActiveCall = true;
    wrapper = mountButton();
    await click(wrapper);
    expect(env.store.dispatch).toHaveBeenCalledTimes(3);
  });

  it('asks which inbox to use when there are several', async () => {
    env.inboxes.value = [twilio, whatsapp];
    env.whatsapp.initiateOutboundCall.mockResolvedValue({
      id: 9,
      call_id: 'wa-1',
      conversation_id: 60,
    });
    const wrapper = mountButton();
    await click(wrapper);
    expect(env.dialogOpen).toHaveBeenCalled();
    const choices = wrapper.findAll('.picker button');
    expect(choices.map(c => c.text())).toEqual(['Phone+1555', 'WA']);
    await choices[1].trigger('click');
    await flushPromises();
    expect(env.dialogClose).toHaveBeenCalled();
    expect(env.whatsapp.initiateOutboundCall).toHaveBeenCalledWith({
      contactId: 7,
      inboxId: 2,
    });
    expect(env.calls.addCall).toHaveBeenCalledWith({
      callSid: 'wa-1',
      callId: 9,
      conversationId: 60,
      inboxId: 2,
      callDirection: 'outbound',
      provider: 'whatsapp',
    });
    expect(env.router.push).toHaveBeenCalledWith({
      path: '/app/accounts/1/conversations/60',
    });
  });

  it('calls from the conversation voice inbox', async () => {
    env.inboxes.value = [twilio, whatsapp];
    env.whatsapp.initiateOutboundCall.mockResolvedValue({
      id: 9,
      call_id: 'wa-1',
    });
    let wrapper = mountButton({ conversationId: 55 });
    await click(wrapper);
    expect(env.whatsapp.initiateOutboundCall).toHaveBeenCalledWith({
      conversationId: 55,
    });
    expect(env.calls.addCall).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 55 })
    );
    expect(env.dialogOpen).not.toHaveBeenCalled();

    // A conversation on a non-voice inbox falls back to the picker.
    wrapper = mountButton({ conversationId: 56 });
    await click(wrapper);
    expect(env.dialogOpen).toHaveBeenCalled();
  });

  it('handles WhatsApp permission requests, locks and errors', async () => {
    env.inboxes.value = [whatsapp];
    const wrapper = mountButton({ conversationId: 55 });
    env.whatsapp.initiateOutboundCall.mockResolvedValueOnce({
      status: 'locked',
    });
    await click(wrapper);
    expect(useAlert).not.toHaveBeenCalled();

    env.whatsapp.initiateOutboundCall.mockResolvedValueOnce({
      status: 'permission_pending',
    });
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACT_PANEL.WHATSAPP_CALL_PERMISSION_PENDING'
    );
    expect(env.router.push).toHaveBeenLastCalledWith({
      path: '/app/accounts/1/conversations/55',
    });

    env.whatsapp.initiateOutboundCall.mockResolvedValueOnce(undefined);
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith(
      'CONTACT_PANEL.WHATSAPP_CALL_PERMISSION_REQUESTED'
    );

    env.whatsapp.initiateOutboundCall.mockRejectedValueOnce(
      Object.assign(new Error('x'), {
        response: { data: { error: 'No permission' } },
      })
    );
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('No permission');
    env.whatsapp.initiateOutboundCall.mockRejectedValueOnce(
      new Error('Socket closed')
    );
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('Socket closed');
    env.whatsapp.initiateOutboundCall.mockRejectedValueOnce({});
    await click(wrapper);
    expect(useAlert).toHaveBeenLastCalledWith('CONTACT_PANEL.CALL_FAILED');
  });
});
