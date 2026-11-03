/**
 * OneTeam behaviour spec for the widget "replying to" footer.
 *
 * Covers quoting the message text, describing an attachment-only
 * message, an empty quote, and dismissing the reply.
 */
import { mount } from '@vue/test-utils';
import FooterReplyTo from '../FooterReplyTo.vue';

/**
 * Mounts the footer for the given message.
 *
 * @param {object} inReplyTo Message being replied to.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountFooter = inReplyTo =>
  mount(FooterReplyTo, {
    props: { inReplyTo },
    global: { stubs: { FluentIcon: true }, mocks: { $t: key => key } },
  });

describe('FooterReplyTo behaviour', () => {
  it('quotes the message text and dismisses', async () => {
    const wrapper = mountFooter({ content: 'Hello there' });
    expect(wrapper.text()).toContain('Hello there');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
  });

  it('describes attachment-only messages', () => {
    const wrapper = mountFooter({ attachments: [{ file_type: 'image' }] });
    expect(wrapper.text()).toContain('ATTACHMENTS.image.CONTENT');
  });

  it('shows an empty quote without content or attachments', () => {
    const wrapper = mountFooter({ attachments: [] });
    expect(wrapper.vm.replyToAttachment).toBe('');
    expect(FooterReplyTo.props.inReplyTo.default()).toBeUndefined();
  });
});
