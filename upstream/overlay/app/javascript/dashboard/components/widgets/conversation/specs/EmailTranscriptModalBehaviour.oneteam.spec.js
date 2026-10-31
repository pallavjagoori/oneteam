/**
 * OneTeam behaviour spec for the "send conversation transcript" modal.
 *
 * Covers which recipients are offered (contact with an email, a user
 * assignee, any other address), validating a typed address, sending to
 * each recipient, the success, payment-required and generic error
 * alerts, cancelling, and closing the modal through v-model.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import EmailTranscriptModal from '../EmailTranscriptModal.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Modal = {
  name: 'WootModal',
  props: ['show', 'onClose'],
  emits: ['update:show'],
  template: '<div class="modal"><slot /></div>',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" :disabled="disabled" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const chat = {
  id: 42,
  meta: {
    sender: { email: 'contact@example.com' },
    assignee: { email: 'agent@example.com' },
    assignee_type: 'User',
  },
};

const mountModal = (currentChat = chat) => {
  const dispatch = vi.fn().mockResolvedValue();
  const wrapper = mount(EmailTranscriptModal, {
    props: { show: true, currentChat },
    global: {
      stubs: { WootModal: Modal, WootModalHeader: true, NextButton },
      mocks: { $t: key => key, $store: { dispatch } },
    },
  });
  return { wrapper, dispatch };
};
const submitButton = wrapper =>
  wrapper.findAllComponents(NextButton).find(b => b.props('type') === 'submit');

describe('EmailTranscriptModal behaviour', () => {
  it('offers the contact, the assignee and another address', () => {
    const { wrapper } = mountModal();
    expect(wrapper.find('#contact').exists()).toBe(true);
    expect(wrapper.find('#assignee').exists()).toBe(true);
    expect(wrapper.find('#other_email_address').exists()).toBe(true);
    expect(submitButton(wrapper).props('disabled')).toBe(true);
  });

  it('hides contact and assignee choices when they cannot receive mail', () => {
    const { wrapper } = mountModal({
      id: 1,
      meta: {
        sender: {},
        assignee: { email: 'bot@example.com' },
        assignee_type: 'AgentBot',
      },
    });
    expect(wrapper.find('#contact').exists()).toBe(false);
    expect(wrapper.find('#assignee').exists()).toBe(false);
    expect(
      mountModal({ id: 2, meta: {} }).wrapper.find('#contact').exists()
    ).toBe(false);
  });

  it.each([
    ['contact', 'contact@example.com'],
    ['assignee', 'agent@example.com'],
  ])('sends the transcript to the %s', async (type, address) => {
    const { wrapper, dispatch } = mountModal();
    await wrapper.find(`#${type}`).setValue(true);
    expect(submitButton(wrapper).props('disabled')).toBe(false);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('sendEmailTranscript', {
      email: address,
      conversationId: 42,
    });
    expect(useAlert).toHaveBeenCalledWith(
      'EMAIL_TRANSCRIPT.SEND_EMAIL_SUCCESS'
    );
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('validates and sends to another address', async () => {
    const { wrapper, dispatch } = mountModal();
    await wrapper.find('#other_email_address').setValue(true);
    expect(submitButton(wrapper).props('disabled')).toBe(true);
    const input = wrapper.find('input[type="text"]');
    await input.setValue('bad');
    expect(wrapper.find('.message').text()).toBe(
      'EMAIL_TRANSCRIPT.FORM.EMAIL.ERROR'
    );
    expect(submitButton(wrapper).props('disabled')).toBe(true);
    await input.setValue('someone@example.com');
    expect(wrapper.find('.message').exists()).toBe(false);
    expect(submitButton(wrapper).props('disabled')).toBe(false);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('sendEmailTranscript', {
      email: 'someone@example.com',
      conversationId: 42,
    });
  });

  it('sends an empty address when nothing is picked', async () => {
    const { wrapper, dispatch } = mountModal();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(dispatch.mock.calls[0][1].email).toBe('');
  });

  it('alerts when payment is required or sending fails', async () => {
    const { wrapper, dispatch } = mountModal();
    dispatch.mockRejectedValueOnce({ response: { status: 402 } });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'EMAIL_TRANSCRIPT.SEND_EMAIL_PAYMENT_REQUIRED'
    );

    dispatch.mockRejectedValueOnce(new Error('down'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('EMAIL_TRANSCRIPT.SEND_EMAIL_ERROR');
    expect(wrapper.emitted('cancel')).toBeUndefined();
  });

  it('cancels from the button and closes through the modal', async () => {
    const { wrapper } = mountModal();
    await wrapper.findAllComponents(NextButton)[0].trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.findComponent(Modal).vm.$emit('update:show', false);
    expect(wrapper.emitted('update:show')).toEqual([[false]]);
  });
});
