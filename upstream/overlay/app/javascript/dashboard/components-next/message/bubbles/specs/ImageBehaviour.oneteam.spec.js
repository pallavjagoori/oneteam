/**
 * OneTeam behaviour spec for the image message bubble.
 *
 * Covers waiting for the image to load, the loaded preview with its
 * download button (success and failure), skipping the load without a URL,
 * opening and closing the gallery, and the unavailable state after a
 * gallery error.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ImageBubble from '../Image.vue';

const env = vi.hoisted(() => ({
  attachments: null,
  isLoaded: null,
  hasError: null,
  loads: [],
  download: vi.fn(),
  alerts: [],
}));

vi.mock('../../provider.js', () => ({
  useMessageContext: () => ({
    attachments: env.attachments,
    filteredCurrentChatAttachments: [],
  }),
}));
vi.mock('dashboard/composables/loadWithRetry', () => ({
  useLoadWithRetry: () => ({
    isLoaded: env.isLoaded,
    hasError: env.hasError,
    loadWithRetry: url => env.loads.push(url),
  }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: message => env.alerts.push(message),
}));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  downloadFile: (...args) => env.download(...args),
}));

const Gallery = {
  name: 'GalleryView',
  props: ['attachment', 'show'],
  emits: ['error', 'close', 'update:show'],
  template: '<div class="gallery" />',
};
const Button = {
  name: 'Button',
  props: ['icon', 'isLoading'],
  template: '<button :class="icon" />',
};

const mountBubble = attachment => {
  env.attachments = ref([attachment]);
  return mount(ImageBubble, {
    global: {
      stubs: {
        BaseBubble: { template: '<div class="base"><slot /></div>' },
        GalleryView: Gallery,
        Button,
        Icon: true,
      },
    },
  });
};

const image = {
  dataUrl: 'https://cdn.test/a.png',
  fileType: 'image',
  extension: 'png',
  width: 10,
  height: 20,
};

describe('Image bubble behaviour', () => {
  beforeEach(() => {
    env.isLoaded = ref(false);
    env.hasError = ref(false);
    env.loads = [];
    env.download = vi.fn().mockResolvedValue();
    env.alerts = [];
  });

  it('loads, previews and downloads the image', async () => {
    const wrapper = mountBubble(image);
    expect(env.loads).toEqual(['https://cdn.test/a.png']);
    expect(wrapper.find('img').exists()).toBe(false);
    env.isLoaded.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('img').attributes('width')).toBe('10');

    await wrapper.find('.i-lucide-download').trigger('click');
    await flushPromises();
    expect(env.download).toHaveBeenCalledWith({
      url: 'https://cdn.test/a.png',
      type: 'image',
      extension: 'png',
    });
    expect(wrapper.find('.gallery').exists()).toBe(false);

    env.download.mockRejectedValueOnce(new Error('no'));
    await wrapper.find('.i-lucide-download').trigger('click');
    await flushPromises();
    expect(env.alerts).toEqual(['GALLERY_VIEW.ERROR_DOWNLOADING']);
    expect(wrapper.findAllComponents(Button).at(-1).props('isLoading')).toBe(
      false
    );
  });

  it('opens the gallery and shows errors from it', async () => {
    env.isLoaded.value = true;
    const wrapper = mountBubble({ ...image, dataUrl: '' });
    expect(env.loads).toEqual([]);
    await wrapper.find('.base').trigger('click');
    const gallery = wrapper.findComponent(Gallery);
    expect(gallery.props('attachment')).toMatchObject({ file_type: 'image' });
    await gallery.vm.$emit('close');
    expect(wrapper.find('.gallery').exists()).toBe(false);

    await wrapper.find('.base').trigger('click');
    await wrapper.findComponent(Gallery).vm.$emit('update:show', false);
    expect(wrapper.find('.gallery').exists()).toBe(false);

    await wrapper.find('.base').trigger('click');
    await wrapper.findComponent(Gallery).vm.$emit('error');
    expect(wrapper.text()).toContain('COMPONENTS.MEDIA.IMAGE_UNAVAILABLE');
  });
});
