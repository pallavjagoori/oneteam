/**
 * OneTeam behaviour spec for the WhatsApp templates modal.
 *
 * Covers picking a template, the selected subtitle, resetting on inbox
 * or contact info changes, going back, sending, and the modal show and
 * close bindings.
 */
import { mount } from '@vue/test-utils';
import Modal from '../Modal.vue';

/**
 * Mounts the modal.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountModal = () =>
  mount(Modal, {
    props: { show: true, inboxId: 1, sendRenderedContent: true },
    global: {
      mocks: {
        $t: (key, params) => (params ? `${key}:${params.templateName}` : key),
      },
      stubs: {
        WootModal: {
          name: 'WootModal',
          props: ['show', 'onClose'],
          emits: ['update:show'],
          template: '<div><slot /></div>',
        },
        WootModalHeader: {
          props: ['headerContent'],
          template: '<h2>{{ headerContent }}</h2>',
        },
        TemplatesPicker: {
          name: 'TemplatesPicker',
          props: ['inboxId', 'requestContactInfoOnly'],
          emits: ['onSelect'],
          template: '<div class="picker" />',
        },
        WhatsAppTemplateReply: {
          name: 'WhatsAppTemplateReply',
          props: ['template', 'sendRenderedContent'],
          emits: ['resetTemplate', 'sendMessage'],
          template: '<div class="reply" />',
        },
      },
    },
  });

/**
 * Picks a template in the picker.
 *
 * @param {import('@vue/test-utils').VueWrapper} wrapper mounted modal
 * @returns {Promise<void>}
 */
const pick = async wrapper => {
  wrapper
    .findComponent({ name: 'TemplatesPicker' })
    .vm.$emit('onSelect', { name: 'welcome' });
  await wrapper.vm.$nextTick();
};

describe('WhatsApp templates modal behaviour', () => {
  it('picks, sends and resets templates', async () => {
    const wrapper = mountModal();
    expect(wrapper.find('h2').text()).toBe('WHATSAPP_TEMPLATES.MODAL.SUBTITLE');
    await pick(wrapper);
    expect(wrapper.find('h2').text()).toBe(
      'WHATSAPP_TEMPLATES.MODAL.TEMPLATE_SELECTED_SUBTITLE:welcome'
    );
    const reply = wrapper.findComponent({ name: 'WhatsAppTemplateReply' });
    expect(reply.props('sendRenderedContent')).toBe(true);
    reply.vm.$emit('sendMessage', { message: 'hi' });
    expect(wrapper.emitted('onSend')).toEqual([[{ message: 'hi' }]]);
    reply.vm.$emit('resetTemplate');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.picker').exists()).toBe(true);
  });

  it('resets when the inbox or contact info mode changes', async () => {
    const wrapper = mountModal();
    await pick(wrapper);
    await wrapper.setProps({ inboxId: 2 });
    expect(wrapper.find('.picker').exists()).toBe(true);
    await pick(wrapper);
    await wrapper.setProps({ requestContactInfoOnly: true });
    expect(
      wrapper
        .findComponent({ name: 'TemplatesPicker' })
        .props('requestContactInfoOnly')
    ).toBe(true);
  });

  it('binds show and close to the modal', () => {
    const wrapper = mountModal();
    const modal = wrapper.findComponent({ name: 'WootModal' });
    modal.vm.$emit('update:show', false);
    expect(wrapper.emitted('update:show')).toEqual([[false]]);
    modal.props('onClose')();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
