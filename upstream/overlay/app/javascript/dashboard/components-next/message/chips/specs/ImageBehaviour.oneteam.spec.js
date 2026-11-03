/**
 * OneTeam behaviour spec for the image attachment chip.
 *
 * Covers the thumbnail, the failed-load placeholder, and opening and
 * closing the gallery (by close, by v-model and on a gallery error).
 */
import { mount } from '@vue/test-utils';
import ImageChip from '../Image.vue';

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({ filteredCurrentChatAttachments: [{ id: 9 }] }),
}));

const GalleryView = {
  name: 'GalleryView',
  props: ['attachment', 'allAttachments', 'show'],
  emits: ['error', 'close', 'update:show'],
  template: '<div class="gallery" />',
};

/**
 * Mounts the chip.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountChip = () =>
  mount(ImageChip, {
    props: { attachment: { id: 9, dataUrl: 'https://x.test/i.png' } },
    global: {
      stubs: { GalleryView, Icon: true },
      mocks: { $t: key => key },
    },
  });

describe('Image chip behaviour', () => {
  it('opens and closes the gallery', async () => {
    const wrapper = mountChip();
    expect(wrapper.get('img').attributes('src')).toBe('https://x.test/i.png');
    expect(wrapper.findComponent(GalleryView).exists()).toBe(false);
    await wrapper.get('.cursor-pointer').trigger('click');
    const gallery = wrapper.getComponent(GalleryView);
    expect(gallery.props()).toMatchObject({
      attachment: { id: 9, data_url: 'https://x.test/i.png' },
      allAttachments: [{ id: 9 }],
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

  it('shows a placeholder when the image fails', async () => {
    const wrapper = mountChip();
    await wrapper.get('img').trigger('error');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain('COMPONENTS.MEDIA.LOADING_FAILED');
  });

  it('shows a placeholder after a gallery error', async () => {
    const wrapper = mountChip();
    await wrapper.get('.cursor-pointer').trigger('click');
    wrapper.getComponent(GalleryView).vm.$emit('error');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('img').exists()).toBe(false);
  });
});
