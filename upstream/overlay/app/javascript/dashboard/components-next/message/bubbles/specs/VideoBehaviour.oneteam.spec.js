/**
 * OneTeam behaviour spec for the video message bubble.
 *
 * Covers plain videos and Instagram reels, playback errors, opening the
 * gallery from the bubble (not from the player), and closing it by event
 * or v-model.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import VideoBubble from '../Video.vue';

const env = vi.hoisted(() => ({ attachments: null }));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({
    attachments: env.attachments,
    filteredCurrentChatAttachments: [],
  }),
}));

const Gallery = {
  name: 'GalleryView',
  props: ['attachment', 'show'],
  emits: ['error', 'close', 'update:show'],
  template: '<div class="gallery" />',
};
const mountVideo = fileType => {
  env.attachments = ref([{ fileType, dataUrl: 'v.mp4' }]);
  return mount(VideoBubble, {
    global: {
      stubs: {
        GalleryView: Gallery,
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
        BaseBubble: { template: '<div class="bubble"><slot /></div>' },
      },
    },
  });
};

describe('Video bubble behaviour', () => {
  it('plays a video, reports errors and opens the gallery', async () => {
    const wrapper = mountVideo('video');
    const video = wrapper.find('video');
    expect(video.attributes('src')).toBe('v.mp4');
    expect(video.classes()).toContain('max-w-full');
    expect(wrapper.find('.i-lucide-instagram').exists()).toBe(false);
    await video.trigger('error');
    expect(wrapper.emitted('error')).toHaveLength(1);

    await video.trigger('click');
    expect(wrapper.find('.gallery').exists()).toBe(false);
    await wrapper.find('.bubble').trigger('click');
    const gallery = wrapper.findComponent(Gallery);
    expect(gallery.props('attachment')).toEqual({
      file_type: 'video',
      data_url: 'v.mp4',
    });
    gallery.vm.$emit('error');
    await gallery.vm.$emit('close');
    expect(wrapper.find('.gallery').exists()).toBe(false);

    await wrapper.find('.bubble').trigger('click');
    await wrapper.findComponent(Gallery).vm.$emit('update:show', false);
    expect(wrapper.find('.gallery').exists()).toBe(false);
  });

  it('marks Instagram reels', () => {
    const wrapper = mountVideo('ig_reel');
    expect(wrapper.find('.i-lucide-instagram').exists()).toBe(true);
    expect(wrapper.find('video').classes()).toContain('max-w-48');
  });
});
