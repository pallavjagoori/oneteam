/**
 * OneTeam behaviour spec for the WhatsApp template reply footer.
 *
 * Covers forwarding the parser's send and reset events and wiring the
 * footer buttons to the parser's slot actions.
 */
import { mount } from '@vue/test-utils';
import WhatsAppTemplateReply from '../WhatsAppTemplateReply.vue';

const env = vi.hoisted(() => ({}));

describe('WhatsAppTemplateReply behaviour', () => {
  it('forwards parser events and wires the footer buttons', async () => {
    env.send = vi.fn();
    env.reset = vi.fn();
    const wrapper = mount(WhatsAppTemplateReply, {
      props: { template: { name: 'hello' } },
      global: {
        mocks: { $t: key => key },
        stubs: {
          WhatsAppTemplateParser: {
            name: 'WhatsAppTemplateParser',
            emits: ['sendMessage', 'resetTemplate'],
            setup: () => ({ env }),
            template:
              '<div><slot name="actions" :send-message="env.send" :reset-template="env.reset" :disabled="false" /></div>',
          },
          NextButton: {
            props: ['label'],
            emits: ['click'],
            template: '<button @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    });
    const parser = wrapper.findComponent({ name: 'WhatsAppTemplateParser' });
    parser.vm.$emit('sendMessage', { body: 'x' });
    parser.vm.$emit('resetTemplate');
    expect(wrapper.emitted('sendMessage')).toEqual([[{ body: 'x' }]]);
    expect(wrapper.emitted('resetTemplate')).toHaveLength(1);

    const [back, send] = wrapper.findAll('button');
    await back.trigger('click');
    await send.trigger('click');
    expect(env.reset).toHaveBeenCalled();
    expect(env.send).toHaveBeenCalled();
  });
});
