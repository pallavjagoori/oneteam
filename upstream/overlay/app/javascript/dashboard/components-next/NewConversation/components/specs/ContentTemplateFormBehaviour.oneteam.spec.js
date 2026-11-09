/**
 * OneTeam behaviour spec for the new conversation content template form.
 *
 * Covers forwarding the parser's send and back events and wiring the
 * footer buttons to the parser's slot actions.
 */
import { mount } from '@vue/test-utils';
import ContentTemplateForm from '../ContentTemplateForm.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

describe('ContentTemplateForm behaviour', () => {
  it('forwards parser events and wires the footer buttons', async () => {
    env.send = vi.fn();
    env.back = vi.fn();
    const wrapper = mount(ContentTemplateForm, {
      props: { template: { sid: 'x' } },
      global: {
        stubs: {
          ContentTemplateParser: {
            name: 'ContentTemplateParser',
            emits: ['sendMessage', 'back'],
            setup: () => ({ env }),
            template:
              '<div><slot name="actions" :send-message="env.send" :go-back="env.back" :disabled="false" /></div>',
          },
          Button: {
            props: ['label'],
            emits: ['click'],
            template: '<button @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    });
    const parser = wrapper.findComponent({ name: 'ContentTemplateParser' });
    parser.vm.$emit('sendMessage', { body: 'x' });
    parser.vm.$emit('back');
    expect(wrapper.emitted('sendMessage')).toEqual([[{ body: 'x' }]]);
    expect(wrapper.emitted('back')).toHaveLength(1);

    const [back, send] = wrapper.findAll('button');
    await back.trigger('click');
    await send.trigger('click');
    expect(env.back).toHaveBeenCalled();
    expect(env.send).toHaveBeenCalled();
  });
});
