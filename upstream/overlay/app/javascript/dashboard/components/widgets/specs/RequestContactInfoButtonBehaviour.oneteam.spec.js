/**
 * OneTeam behaviour spec for the WhatsApp "request contact info" button.
 *
 * Covers checking availability (only for WhatsApp Cloud chats without a
 * phone number, refetching when the chat or request messages change,
 * API errors), when the button shows, pending request states and
 * tooltips, sending a request, falling back to the template flow, and
 * request failures (alert and refetch, ignored after switching chats).
 */
import { nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import RequestContactInfoButton from '../RequestContactInfoButton.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useInbox', () => ({
  useInbox: () => ({ isAWhatsAppCloudChannel: env.isCloud }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
  useMapGetter: key => (key === 'getSelectedChat' ? env.chat : env.contactGetter),
}));

const NextButton = {
  name: 'NextButton',
  props: { disabled: Boolean, isLoading: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

const mountButton = () =>
  mount(RequestContactInfoButton, {
    global: {
      stubs: { NextButton },
      directives: {
        tooltip: {
          mounted: (el, binding) => { env.tooltip = binding.value; },
          updated: (el, binding) => { env.tooltip = binding.value; },
        },
      },
    },
  });
const chat = (overrides = {}) => ({ id: 10, can_reply: true, meta: { sender: { id: 3 } }, messages: [], ...overrides });
const requestMessage = (state, status = 'sent') => ({
  id: 1,
  status,
  content_attributes: { whatsapp_contact_info: { type: 'request', state } },
});

describe('Request contact info button behaviour', () => {
  beforeEach(() => {
    env.isCloud = ref(true);
    env.chat = ref(chat());
    env.contacts = { 3: { id: 3 } };
    env.contactGetter = ref(id => env.contacts[id]);
    env.dispatch = vi.fn(action =>
      action === 'getContactInfoRequestAvailability' ? Promise.resolve({ available: true }) : Promise.resolve()
    );
  });

  it('checks availability and sends a request', async () => {
    const wrapper = mountButton();
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('getContactInfoRequestAvailability', {
      conversationId: 10,
      signal: expect.any(AbortSignal),
    });
    expect(env.tooltip).toBe('CONVERSATION.REQUEST_CONTACT_INFO.ACTION');
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(false);
    let finish;
    env.dispatch.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(NextButton).props()).toEqual({ isLoading: true, disabled: true });
    finish();
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('requestContactInfo', 10);
    expect(wrapper.findComponent(NextButton).props('isLoading')).toBe(false);
  });

  it('asks for a template when the window is closed', async () => {
    env.dispatch.mockImplementation(() => Promise.resolve({ available: true, delivery_mode: 'template' }));
    const wrapper = mountButton();
    await flushPromises();
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('requestTemplate')).toHaveLength(1);
  });

  it('skips the check for other channels, known numbers and missing chats', async () => {
    env.isCloud.value = false;
    expect(mountButton().find('button').exists()).toBe(false);
    env.isCloud.value = true;
    env.contacts[3].phone_number = '+1555';
    mountButton();
    env.chat.value = chat({ meta: {} });
    env.chat.value = null;
    mountButton();
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('shows a pending request as disabled', async () => {
    env.dispatch.mockImplementation(() => Promise.resolve({ available: false, reason: 'pending_request' }));
    const wrapper = mountButton();
    await flushPromises();
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(true);
    expect(env.tooltip).toBe('CONVERSATION.REQUEST_CONTACT_INFO.PENDING_ACTION');
  });

  it('treats pending request messages as pending unless they failed', async () => {
    env.chat.value = chat({ messages: [requestMessage('pending'), { id: 2, content_attributes: {} }] });
    const wrapper = mountButton();
    await flushPromises();
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(true);
    env.chat.value = chat({ messages: [requestMessage('pending', 'failed')] });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledTimes(2);
    expect(wrapper.findComponent(NextButton).props('disabled')).toBe(false);
  });

  it('hides the button when unavailable and reports check errors', async () => {
    env.dispatch.mockImplementationOnce(() => Promise.resolve(null));
    const wrapper = mountButton();
    await flushPromises();
    expect(wrapper.find('button').exists()).toBe(false);
    env.dispatch.mockImplementationOnce(() => Promise.reject({ response: { data: { error: 'Not allowed' } } }));
    env.chat.value = chat({ can_reply: false });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Not allowed');
    env.dispatch.mockImplementationOnce(() => Promise.reject(new Error('x')));
    env.chat.value = chat({ can_reply: true });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('CONVERSATION.MESSAGE_ERROR');
  });

  it('reports request failures and refetches availability', async () => {
    const wrapper = mountButton();
    await flushPromises();
    env.dispatch.mockImplementationOnce(() => Promise.reject({ response: { data: { error: 'Window closed' } } }));
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Window closed');
    expect(env.dispatch.mock.calls.filter(c => c[0] === 'getContactInfoRequestAvailability')).toHaveLength(2);
    env.dispatch.mockImplementationOnce(() => Promise.reject(new Error('x')));
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('CONVERSATION.MESSAGE_ERROR');
  });

  it('ignores a failed request after switching conversations', async () => {
    const wrapper = mountButton();
    await flushPromises();
    let fail;
    env.dispatch.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        })
    );
    await wrapper.find('button').trigger('click');
    env.chat.value = chat({ id: 11 });
    await nextTick();
    fail(new Error('late'));
    await flushPromises();
    expect(useAlert).not.toHaveBeenCalled();
  });
});
