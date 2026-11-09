/**
 * OneTeam behaviour spec for the email inbox finish step.
 *
 * Shows the forwarding address only when forwarding is enabled, and always
 * links to the inbox configuration tab for SMTP and IMAP settings.
 */
import { mount } from '@vue/test-utils';
import EmailInboxFinish from '../EmailInboxFinish.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const RouterLink = {
  name: 'RouterLink',
  props: { to: { type: Object, default: () => ({}) } },
  template: '<a><slot /></a>',
};

const mountFinish = inbox =>
  mount(EmailInboxFinish, {
    props: { inbox, inboxId: 7 },
    global: {
      stubs: { RouterLink, WootCode: { template: '<pre class="code" />' } },
      mocks: { $t: key => key },
    },
  });

describe('EmailInboxFinish behaviour', () => {
  it('shows the forwarding address and the configuration link', () => {
    const wrapper = mountFinish({
      forwarding_enabled: true,
      forward_to_email: 'in@x.test',
    });
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ADD.EMAIL_CHANNEL.FINISH_MESSAGE'
    );
    expect(wrapper.find('.code').exists()).toBe(true);
    const link = wrapper.findComponent(RouterLink);
    expect(link.props('to')).toEqual({
      name: 'settings_inbox_show',
      params: { inboxId: 7, tab: 'configuration' },
    });
    expect(link.text()).toBe(
      'INBOX_MGMT.ADD.EMAIL_CHANNEL.CONFIGURE_SMTP_IMAP_LINK'
    );
  });

  it('hides the forwarding address when forwarding is off', () => {
    const wrapper = mountFinish({ forwarding_enabled: false });
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ADD.EMAIL_CHANNEL.FINISH_MESSAGE_NO_FORWARDING'
    );
    expect(wrapper.find('.code').exists()).toBe(false);
  });
});
