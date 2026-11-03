/**
 * OneTeam behaviour spec for the unsupported message bubble.
 *
 * Covers the channel-specific message keys and the WhatsApp details.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import UnsupportedBubble from '../Unsupported.vue';

const env = vi.hoisted(() => ({ flags: {} }));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({ inboxId: ref(3) }),
}));

vi.mock('dashboard/composables/useInbox', async () => {
  const { ref: vueRef } = await import('vue');
  return {
    useInbox: () => ({
      isAFacebookInbox: vueRef(!!env.flags.facebook),
      isAnInstagramChannel: vueRef(!!env.flags.instagram),
      isATiktokChannel: vueRef(!!env.flags.tiktok),
      isAWhatsAppChannel: vueRef(!!env.flags.whatsapp),
    }),
  };
});

/**
 * Mounts the bubble for the given channel flags.
 *
 * @param {object} flags channel flags
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountBubble = flags => {
  env.flags = flags;
  return mount(UnsupportedBubble, {
    global: {
      mocks: { $t: key => key },
      stubs: {
        BaseBubble: { template: '<div><slot /></div>' },
        I18nT: {
          props: { keypath: String },
          template: '<p>{{ keypath }}<slot name="documentation" /></p>',
        },
      },
    },
  });
};

describe('Unsupported bubble behaviour', () => {
  it.each([
    [{ facebook: true }, 'CONVERSATION.UNSUPPORTED_MESSAGE_FACEBOOK'],
    [{ instagram: true }, 'CONVERSATION.UNSUPPORTED_MESSAGE_INSTAGRAM'],
    [{ tiktok: true }, 'CONVERSATION.UNSUPPORTED_MESSAGE_TIKTOK'],
    [{}, 'CONVERSATION.UNSUPPORTED_MESSAGE'],
  ])('shows the key for %o', (flags, key) => {
    expect(mountBubble(flags).text()).toBe(key);
  });

  it('shows the WhatsApp details and help link', () => {
    const wrapper = mountBubble({ whatsapp: true });
    expect(wrapper.text()).toContain(
      'CONVERSATION.UNSUPPORTED_MESSAGE_WHATSAPP_TITLE'
    );
    expect(wrapper.find('a').attributes('href')).toContain(
      'developers.facebook.com'
    );
  });
});
