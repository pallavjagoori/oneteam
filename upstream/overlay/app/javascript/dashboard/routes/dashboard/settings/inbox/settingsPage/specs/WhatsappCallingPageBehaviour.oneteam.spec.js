/**
 * OneTeam behaviour spec for the WhatsApp calling inbox settings.
 *
 * Covers seeding from the inbox's provider config (and defaults),
 * following config changes, enabling/disabling calling and inbound
 * calls (success, failure rollback, ignoring double toggles, spinners),
 * the phone number section, and saving the permission request text
 * (trimmed or cleared, with API and fallback errors).
 */
import { flushPromises, mount } from '@vue/test-utils';
import InboxesAPI from 'dashboard/api/inboxes';
import { useAlert } from 'dashboard/composables';
import WhatsappCallingPage from '../WhatsappCallingPage.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/inboxes', () => ({
  default: {
    setInboundCalls: vi.fn(),
    enableWhatsappCalling: vi.fn(),
    disableWhatsappCalling: vi.fn(),
  },
}));

const Toggle = {
  name: 'SettingsToggleSection',
  props: ['modelValue', 'header', 'hideToggle'],
  emits: ['update:modelValue'],
  template: '<section class="toggle"><slot name="hiddenToggle" /></section>',
};
const Field = {
  name: 'SettingsFieldSection',
  props: ['label'],
  template: '<div class="field"><slot /></div>',
};
const NextButton = {
  name: 'NextButton',
  props: ['isLoading', 'label'],
  template: '<button>{{ label }}</button>',
};
const TextArea = {
  name: 'TextArea',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<textarea />',
};

const mountPage = (inbox = {}) => {
  const store = { dispatch: vi.fn() };
  const wrapper = mount(WhatsappCallingPage, {
    props: { inbox: { id: 4, ...inbox } },
    global: {
      stubs: {
        SettingsToggleSection: Toggle,
        SettingsFieldSection: Field,
        NextButton,
        TextArea,
        Spinner: true,
        CallRecordingSettings: true,
        WootCode: { props: ['script'], template: '<code>{{ script }}</code>' },
      },
      mocks: { $store: store, $t: key => key },
    },
  });
  return { wrapper, store };
};

const toggles = wrapper => wrapper.findAllComponents(Toggle);
const pending = () => {
  let finish;
  let fail;
  const promise = new Promise((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  return { promise, finish, fail };
};

describe('WhatsappCallingPage behaviour', () => {
  it('starts with calling off and follows config changes', async () => {
    const { wrapper } = mountPage();
    expect(toggles(wrapper)).toHaveLength(1);
    expect(toggles(wrapper)[0].props('modelValue')).toBe(false);

    await wrapper.setProps({
      inbox: {
        id: 4,
        provider_config: {
          calling_enabled: true,
          inbound_calls_enabled: false,
          call_permission_request_body: 'May we call?',
        },
      },
    });
    expect(toggles(wrapper)[1].props('modelValue')).toBe(false);
    expect(wrapper.findComponent(TextArea).props('modelValue')).toBe(
      'May we call?'
    );
    await wrapper.setProps({
      inbox: {
        id: 4,
        provider_config: {
          calling_enabled: undefined,
          inbound_calls_enabled: true,
          call_permission_request_body: undefined,
        },
      },
    });
    expect(toggles(wrapper)).toHaveLength(1);
    await wrapper.setProps({
      inbox: {
        id: 4,
        provider_config: { calling_enabled: true, inbound_calls_enabled: true },
      },
    });
    expect(toggles(wrapper)[1].props('modelValue')).toBe(true);
    expect(wrapper.findComponent(TextArea).props('modelValue')).toBe('');
  });

  it('renders without an inbox', () => {
    const wrapper = mount(WhatsappCallingPage, {
      global: {
        stubs: { SettingsToggleSection: Toggle },
        mocks: { $store: {}, $t: key => key },
      },
    });
    expect(toggles(wrapper)[0].props('modelValue')).toBe(false);
  });

  it('shows the phone number from config or the inbox', () => {
    let { wrapper } = mountPage({
      provider_config: { calling_enabled: true, phone_number: '+1555' },
    });
    expect(wrapper.find('code').text()).toBe('+1555');
    expect(toggles(wrapper)[1].props('modelValue')).toBe(true);
    ({ wrapper } = mountPage({
      phone_number: '+1666',
      provider_config: { calling_enabled: true },
    }));
    expect(wrapper.find('code').text()).toBe('+1666');
    ({ wrapper } = mountPage({ provider_config: { calling_enabled: true } }));
    expect(wrapper.find('code').exists()).toBe(false);
  });

  it('enables and disables calling', async () => {
    const { wrapper, store } = mountPage();
    const call = pending();
    InboxesAPI.enableWhatsappCalling.mockReturnValue(call.promise);
    await toggles(wrapper)[0].vm.$emit('update:modelValue', true);
    expect(toggles(wrapper)[0].props('hideToggle')).toBe(true);
    expect(wrapper.find('spinner-stub').exists()).toBe(true);
    await toggles(wrapper)[0].vm.$emit('update:modelValue', false);
    expect(InboxesAPI.disableWhatsappCalling).not.toHaveBeenCalled();
    call.finish();
    await flushPromises();
    expect(store.dispatch).toHaveBeenCalledWith('inboxes/get', 4);
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'
    );
    expect(toggles(wrapper)).toHaveLength(2);

    InboxesAPI.disableWhatsappCalling.mockResolvedValue({});
    await toggles(wrapper)[0].vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(InboxesAPI.disableWhatsappCalling).toHaveBeenCalledWith(4);
    expect(toggles(wrapper)).toHaveLength(1);
  });

  it('rolls calling back when the change fails', async () => {
    const { wrapper } = mountPage();
    InboxesAPI.enableWhatsappCalling.mockRejectedValue(new Error('no'));
    await toggles(wrapper)[0].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.WHATSAPP_CALLING.ENABLE_FAILED'
    );
    expect(toggles(wrapper)[0].props('modelValue')).toBe(false);

    const enabled = mountPage({
      provider_config: { calling_enabled: true },
    }).wrapper;
    InboxesAPI.disableWhatsappCalling.mockRejectedValue(new Error('no'));
    await toggles(enabled)[0].vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.EDIT.API.ERROR_MESSAGE'
    );
    expect(toggles(enabled)[0].props('modelValue')).toBe(true);
  });

  it('toggles inbound calls with rollback on failure', async () => {
    const { wrapper, store } = mountPage({
      provider_config: { calling_enabled: true },
    });
    const call = pending();
    InboxesAPI.setInboundCalls.mockReturnValue(call.promise);
    await toggles(wrapper)[1].vm.$emit('update:modelValue', false);
    expect(toggles(wrapper)[1].props('hideToggle')).toBe(true);
    await toggles(wrapper)[1].vm.$emit('update:modelValue', true);
    expect(InboxesAPI.setInboundCalls).toHaveBeenCalledTimes(1);
    call.finish();
    await flushPromises();
    expect(InboxesAPI.setInboundCalls).toHaveBeenCalledWith(4, false);
    expect(store.dispatch).toHaveBeenCalledWith('inboxes/get', 4);
    expect(toggles(wrapper)[1].props('modelValue')).toBe(false);

    InboxesAPI.setInboundCalls.mockRejectedValue(new Error('no'));
    await toggles(wrapper)[1].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.EDIT.API.ERROR_MESSAGE'
    );
    expect(toggles(wrapper)[1].props('modelValue')).toBe(false);
  });

  it('saves the permission request text', async () => {
    const { wrapper, store } = mountPage({
      provider_config: { calling_enabled: true, other: 1 },
    });
    await wrapper
      .findComponent(TextArea)
      .vm.$emit('update:modelValue', '  Can we call you?  ');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(store.dispatch).toHaveBeenCalledWith('inboxes/updateInbox', {
      id: 4,
      formData: false,
      channel: {
        provider_config: {
          calling_enabled: true,
          other: 1,
          call_permission_request_body: 'Can we call you?',
        },
      },
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'
    );

    await wrapper.findComponent(TextArea).vm.$emit('update:modelValue', '   ');
    store.dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Too long' } },
    });
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(
      store.dispatch.mock.calls.at(-1)[1].channel.provider_config
        .call_permission_request_body
    ).toBe(null);
    expect(useAlert).toHaveBeenLastCalledWith('Too long');

    store.dispatch.mockRejectedValueOnce(undefined);
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'INBOX_MGMT.EDIT.API.ERROR_MESSAGE'
    );
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);
  });
});
