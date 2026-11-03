/**
 * OneTeam behaviour spec for the compose-conversation WhatsApp template
 * step.
 *
 * Covers passing the template to the parser, its back and send actions
 * (send disabled while the parser says so), and relaying the parser's
 * send and back events.
 */
import { mount } from '@vue/test-utils';
import WhatsappTemplate from '../WhatsappTemplate.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const actions = { sendMessage: vi.fn(), goBack: vi.fn() };
const WhatsAppTemplateParser = {
  name: 'WhatsAppTemplateParser',
  props: ['template'],
  emits: ['sendMessage', 'back'],
  setup: () => ({ actions }),
  template:
    '<div><slot name="actions" :send-message="actions.sendMessage" :go-back="actions.goBack" :disabled="true" /></div>',
};
const Button = {
  name: 'NextButton',
  props: { label: String, disabled: Boolean },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

describe('WhatsappTemplate behaviour', () => {
  it('wires the parser actions and relays its events', async () => {
    const template = { name: 'welcome' };
    const wrapper = mount(WhatsappTemplate, {
      props: { template },
      global: { stubs: { WhatsAppTemplateParser, Button } },
    });
    const parser = wrapper.getComponent(WhatsAppTemplateParser);
    expect(parser.props('template')).toEqual(template);
    const [back, send] = wrapper.findAllComponents(Button);
    expect(back.props('label')).toContain('TEMPLATE_PARSER.BACK');
    expect(send.props('disabled')).toBe(true);
    await back.trigger('click');
    await send.trigger('click');
    expect(actions.goBack).toHaveBeenCalled();
    expect(actions.sendMessage).toHaveBeenCalled();
    parser.vm.$emit('sendMessage', { message: 'hi' });
    parser.vm.$emit('back');
    expect(wrapper.emitted('sendMessage')).toEqual([[{ message: 'hi' }]]);
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('defaults to an empty template', () => {
    expect(WhatsappTemplate.props.template.default()).toEqual({});
  });
});
