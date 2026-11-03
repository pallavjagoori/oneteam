/**
 * OneTeam behaviour spec for the video attachment chip.
 *
 * Covers opening the gallery on click and closing it by its close event
 * and by v-model.
 */
import { mount } from '@vue/test-utils';
import VideoChip from '../Video.vue';

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({ filteredCurrentChatAttachments: [{ id: 4 }] }),
}));

const GalleryView = {
  name: 'GalleryView',
  props: ['attachment', 'allAttachments', 'show'],
  emits: ['error', 'close', 'update:show'],
  template: '<div class="gallery" />',
};

describe('Video chip behaviour', () => {
  it('opens and closes the gallery', async () => {
    const wrapper = mount(VideoChip, {
      props: { attachment: { id: 4, dataUrl: 'https://x.test/v.mp4' } },
      global: { stubs: { GalleryView, Icon: true } },
    });
    expect(wrapper.get('video').attributes('src')).toBe('https://x.test/v.mp4');
    await wrapper.get('.cursor-pointer').trigger('click');
    const gallery = wrapper.getComponent(GalleryView);
    expect(gallery.props()).toMatchObject({
      attachment: { id: 4, data_url: 'https://x.test/v.mp4' },
      allAttachments: [{ id: 4 }],
      show: true,
    });
    gallery.vm.$emit('close');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(GalleryView).exists()).toBe(false);

    await wrapper.get('.cursor-pointer').trigger('click');
    wrapper.getComponent(GalleryView).vm.$emit('update:show', false);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(GalleryView).exists()).toBe(false);
  });
});
