/**
 * OneTeam behaviour spec for the content templates modal.
 *
 * Covers picking a template, the selected subtitle, going back, sending
 * the parsed message, and the modal show and close bindings.
 */
import { mount } from '@vue/test-utils';
import ContentTemplatesModal from '../ContentTemplatesModal.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${params.templateName}` : key),
  }),
}));

const env = vi.hoisted(() => ({ send: vi.fn(), reset: vi.fn() }));

/**
 * Mounts the modal.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountModal = () =>
  mount(ContentTemplatesModal, {
    props: { show: true, inboxId: 2 },
    global: {
      mocks: { $t: key => key },
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
          props: ['inboxId'],
          emits: ['onSelect'],
          template: '<div class="picker" />',
        },
        TemplateParser: {
          name: 'TemplateParser',
          props: ['template'],
          emits: ['resetTemplate', 'sendMessage'],
          setup: () => env,
          template:
            '<div class="parser"><slot name="actions" :send-message="send" :reset-template="reset" :disabled="false" /></div>',
        },
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  });

describe('ContentTemplatesModal behaviour', () => {
  it('picks a template, goes back, and sends messages', async () => {
    const wrapper = mountModal();
    expect(wrapper.find('h2').text()).toBe('CONTENT_TEMPLATES.MODAL.SUBTITLE');
    expect(
      wrapper.findComponent({ name: 'TemplatesPicker' }).props('inboxId')
    ).toBe(2);
    wrapper
      .findComponent({ name: 'TemplatesPicker' })
      .vm.$emit('onSelect', { friendly_name: 'Promo' });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('h2').text()).toBe(
      'CONTENT_TEMPLATES.MODAL.TEMPLATE_SELECTED_SUBTITLE:Promo'
    );
    const buttons = wrapper.findAll('button');
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    expect(env.reset).toHaveBeenCalled();
    expect(env.send).toHaveBeenCalled();
    const parser = wrapper.findComponent({ name: 'TemplateParser' });
    parser.vm.$emit('sendMessage', { content: 'hi' });
    expect(wrapper.emitted('onSend')).toEqual([[{ content: 'hi' }]]);
    parser.vm.$emit('resetTemplate');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.picker').exists()).toBe(true);
  });

  it('binds show and close to the modal', () => {
    const wrapper = mountModal();
    const modal = wrapper.findComponent({ name: 'WootModal' });
    expect(modal.props('show')).toBe(true);
    modal.vm.$emit('update:show', false);
    expect(wrapper.emitted('update:show')).toEqual([[false]]);
    modal.props('onClose')();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
});
