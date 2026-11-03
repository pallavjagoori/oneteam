/**
 * OneTeam behaviour spec for the Instagram story message bubble.
 *
 * Covers story replies and plain mentions, formatted and activity text,
 * messages without text, and falling back from image to video to the
 * unavailable notice as each fails to load.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import InstagramStory from '../InstagramStory.vue';

const env = vi.hoisted(() => ({ context: null }));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => env.context,
}));

const mountStory = ({ variant = 'agent', content = '', imageType } = {}) => {
  env.context = {
    variant: ref(variant),
    content: ref(content),
    contentAttributes: ref(imageType ? { imageType } : null),
    attachments: ref([{ dataUrl: 'https://cdn.test/story' }]),
  };
  return mount(InstagramStory, {
    global: {
      stubs: {
        BaseBubble: { template: '<div><slot /></div>' },
        Icon: true,
      },
      directives: {
        'dompurify-html': (el, { value }) => {
          el.innerHTML = value;
        },
      },
    },
  });
};

describe('InstagramStory bubble behaviour', () => {
  it('labels story replies and formats text', () => {
    const reply = mountStory({
      content: '**Nice**',
      imageType: 'ig_story_reply',
    });
    expect(reply.text()).toContain(
      'COMPONENTS.FILE_BUBBLE.INSTAGRAM_STORY_REPLY'
    );
    expect(reply.find('strong').text()).toBe('Nice');

    const activity = mountStory({ variant: 'activity', content: '**raw**' });
    expect(activity.text()).toContain('**raw**');
    expect(activity.text()).not.toContain('STORY_REPLY');

    expect(mountStory().find('.mb-2').exists()).toBe(false);
  });

  it('falls back from image to video to unavailable', async () => {
    const wrapper = mountStory();
    await wrapper.find('img').trigger('error');
    expect(wrapper.find('video').exists()).toBe(true);
    await wrapper.find('video').trigger('error');
    expect(wrapper.text()).toContain(
      'COMPONENTS.FILE_BUBBLE.INSTAGRAM_STORY_UNAVAILABLE'
    );
    expect(wrapper.emitted('error')).toHaveLength(2);
  });
});
