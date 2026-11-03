/**
 * OneTeam behaviour spec for the reply-to preview in the reply box.
 *
 * Covers previewing the quoted message and dismissing it without
 * bubbling the click.
 */
import { mount } from '@vue/test-utils';
import ReplyToMessage from '../ReplyToMessage.vue';

const MessagePreview = {
  name: 'MessagePreview',
  props: ['message', 'showMessageType', 'defaultEmptyMessage'],
  template: '<span />',
};
const Button = {
  name: 'Button',
  props: ['icon'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\', $event)" />',
};

describe('ReplyToMessage behaviour', () => {
  it('previews the message and dismisses it', async () => {
    const parentClick = vi.fn();
    const message = { id: 4, content: 'Hi' };
    const wrapper = mount(
      {
        components: { ReplyToMessage },
        props: ['message'],
        methods: { parentClick },
        template:
          '<div @click="parentClick"><ReplyToMessage :message="message" /></div>',
      },
      {
        props: { message },
        global: {
          stubs: { MessagePreview, Button, FluentIcon: true },
          mocks: { $t: key => key },
          directives: { tooltip: {} },
        },
      }
    );
    expect(wrapper.text()).toContain('CONVERSATION.REPLYBOX.REPLYING_TO');
    expect(wrapper.getComponent(MessagePreview).props()).toEqual({
      message,
      showMessageType: false,
      defaultEmptyMessage: 'CONVERSATION.REPLY_MESSAGE_NOT_FOUND',
    });
    await wrapper.get('button').trigger('click');
    expect(
      wrapper.getComponent(ReplyToMessage).emitted('dismiss')
    ).toHaveLength(1);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
