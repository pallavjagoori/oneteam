/**
 * OneTeam behaviour spec for the fallback message bubble.
 *
 * Covers the message content, linking the attachment by its camelCase
 * or snake_case URL and title, falling back to the URL as the title,
 * and plain text when there is no URL.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import Fallback from '../Fallback.vue';

const env = vi.hoisted(() => ({ attachments: null, content: null }));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({
    attachments: env.attachments,
    content: env.content,
  }),
}));

const FormattedContent = {
  name: 'FormattedContent',
  props: ['content'],
  template: '<p class="content">{{ content }}</p>',
};

/**
 * Mounts the bubble for the given attachments and content.
 *
 * @param {Array|undefined} attachments Message attachments.
 * @param {string} [content] Message content.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountBubble = (attachments, content = '') => {
  env.attachments = ref(attachments);
  env.content = ref(content);
  return mount(Fallback, {
    global: {
      stubs: {
        BaseBubble: { template: '<div><slot /></div>' },
        FormattedContent,
      },
    },
  });
};

describe('Fallback bubble behaviour', () => {
  it('links the attachment with its title and shows content', () => {
    const wrapper = mountBubble(
      [{ dataUrl: 'https://x.test/a', fallbackTitle: 'Shared link' }],
      'Look'
    );
    expect(wrapper.getComponent(FormattedContent).props('content')).toBe(
      'Look'
    );
    const link = wrapper.get('a');
    expect(link.attributes('href')).toBe('https://x.test/a');
    expect(link.text()).toBe('Shared link');
  });

  it('reads snake_case fields and falls back to the URL', () => {
    expect(
      mountBubble([{ data_url: 'https://x.test/b', fallback_title: 'Snake' }])
        .get('a')
        .text()
    ).toBe('Snake');
    const wrapper = mountBubble([{ data_url: 'https://x.test/c' }]);
    expect(wrapper.get('a').text()).toBe('https://x.test/c');
    expect(wrapper.findComponent(FormattedContent).exists()).toBe(false);
  });

  it('shows plain text without a URL', () => {
    const wrapper = mountBubble([{ fallbackTitle: 'Location' }]);
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.get('span').text()).toBe('Location');
    expect(mountBubble(undefined).find('a').exists()).toBe(false);
  });
});
