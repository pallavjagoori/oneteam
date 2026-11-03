/**
 * OneTeam behaviour spec for the email bubble EmailMeta header.
 *
 * Covers the sender name match, plain from addresses, to/cc/bcc lists
 * from either attribute shape, the subject, failed styling, and hiding
 * the header when there is nothing to show.
 */
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import EmailMeta from '../EmailMeta.vue';
import { provideMessageContext } from '../../../provider.js';
import { MESSAGE_STATUS } from '../../../constants';

/**
 * Mounts the header inside a message context.
 *
 * @param {object} contentAttributes message content attributes
 * @param {object} sender message sender
 * @param {string} status message status
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountMeta = (contentAttributes, sender = {}, status = 'sent') => {
  const Host = defineComponent({
    components: { EmailMeta },
    setup() {
      provideMessageContext({
        contentAttributes: ref(contentAttributes),
        sender: ref(sender),
        status: ref(status),
      });
    },
    template: '<EmailMeta />',
  });
  return mount(Host, { global: { mocks: { $t: key => key } } });
};

describe('EmailMeta behaviour', () => {
  it('hides the header without any email data', () => {
    const wrapper = mountMeta({});
    expect(wrapper.find('section').text()).toBe('');
  });

  it('shows the sender name when it matches the from address', () => {
    const wrapper = mountMeta(
      {
        email: {
          from: ['a@x.co'],
          to: ['b@x.co'],
          cc: ['c@x.co'],
          bcc: ['d@x.co'],
          subject: 'Hi',
        },
      },
      { email: 'a@x.co', name: 'Ann' }
    );
    const text = wrapper.text();
    expect(text).toContain('Ann');
    expect(text).toContain('<a@x.co>');
    expect(text).toContain('EMAIL_HEADER.TO: b@x.co');
    expect(text).toContain('c@x.co');
    expect(text).toContain('d@x.co');
    expect(text).toContain('Hi');
  });

  it('shows the plain from address for a different sender', () => {
    const wrapper = mountMeta(
      { email: { from: ['a@x.co'] } },
      { email: 'z@x.co', name: 'Zed' },
      MESSAGE_STATUS.FAILED
    );
    expect(wrapper.text()).toBe('a@x.co');
    expect(wrapper.find('section').classes()).toContain('text-n-ruby-11');
  });

  it('reads top level to, cc and bcc lists without a from address', () => {
    const wrapper = mountMeta(
      { toEmails: ['t@x.co'], ccEmails: ['c@x.co'], bccEmails: ['b@x.co'] },
      { name: 'Nobody' }
    );
    expect(wrapper.text()).toContain('t@x.co');
    expect(wrapper.text()).toContain('c@x.co');
    expect(wrapper.text()).toContain('b@x.co');
    expect(wrapper.text()).not.toContain('Nobody');
  });

  it('returns no sender name when only the sender has an email', () => {
    const wrapper = mountMeta({ toEmails: ['t@x.co'] }, { email: 's@x.co' });
    expect(wrapper.text()).not.toContain('s@x.co');
  });

  it('computes no sender name without any address', () => {
    const wrapper = mountMeta({ toEmails: ['t@x.co'] });
    const meta = wrapper.findComponent(EmailMeta);
    expect(meta.vm.$.setupState.senderName).toBeNull();
  });

  it('computes no sender name when the sender has no email', () => {
    const wrapper = mountMeta({ email: { from: ['a@x.co'] } }, { name: 'N' });
    expect(wrapper.text()).toBe('a@x.co');
  });
});
