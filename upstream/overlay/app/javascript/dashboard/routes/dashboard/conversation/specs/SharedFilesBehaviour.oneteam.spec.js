/**
 * OneTeam behaviour spec for the shared files panel in the conversation
 * sidebar.
 *
 * Covers the spinner while attachments load, the empty state when only
 * non-file attachments exist, the media and file lists, opening a media
 * item in the gallery (newest media first) and closing it, and opening a
 * file in a new tab only when it has a URL.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import SharedFiles from '../SharedFiles.vue';

const env = vi.hoisted(() => ({ getters: {} }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => env.getters[name],
}));

const Media = {
  name: 'Media',
  props: ['attachments', 'peekLimit'],
  emits: ['select'],
  template: '<div class="media" />',
};
const Files = {
  name: 'Files',
  props: ['attachments', 'peekLimit'],
  emits: ['select'],
  template: '<div class="files" />',
};
const GalleryView = {
  name: 'GalleryView',
  props: ['show', 'attachment', 'allAttachments'],
  emits: ['update:show', 'close'],
  template: '<div class="gallery" />',
};

const image = { id: 1, file_type: 'image', data_url: '/a.png', created_at: 1 };
const video = { id: 2, file_type: 'video', data_url: '/b.mp4', created_at: 5 };
const undated = { id: 5, file_type: 'image', data_url: '/c.png' };
const pdf = { id: 3, file_type: 'file', data_url: '/doc.pdf' };
const location = { id: 4, file_type: 'location', data_url: 'geo:1,2' };

const mountPanel = (attachments, loaded = true) => {
  env.getters = {
    getSelectedChatAttachments: ref(attachments),
    getSelectedChatAttachmentsLoaded: ref(loaded),
  };
  return mount(SharedFiles, {
    global: {
      stubs: {
        Media,
        Files,
        GalleryView,
        Spinner: { template: '<i class="spin" />' },
      },
    },
  });
};

describe('SharedFiles behaviour', () => {
  it('shows a spinner, then the empty state', () => {
    expect(mountPanel([], false).find('.spin').exists()).toBe(true);
    const empty = mountPanel([location, { id: 6, file_type: 'file' }]);
    expect(empty.text()).toBe('CONVERSATION_SIDEBAR.SHARED_FILES.EMPTY');
  });

  it('opens media in the gallery, newest first', async () => {
    const attachments = [
      image,
      pdf,
      undated,
      video,
      { ...image, id: 7, data_url: '' },
    ];
    const wrapper = mountPanel(attachments);
    expect(wrapper.findComponent(Media).props()).toEqual({
      attachments,
      peekLimit: 6,
    });
    expect(wrapper.findComponent(Files).props('peekLimit')).toBe(3);
    expect(wrapper.findComponent(GalleryView).exists()).toBe(false);

    await wrapper.findComponent(Media).vm.$emit('select', image);
    const gallery = wrapper.findComponent(GalleryView);
    expect(gallery.props('attachment')).toEqual(image);
    expect(gallery.props('allAttachments').map(a => a.id)).toEqual([2, 1, 5]);

    await gallery.vm.$emit('update:show', false);
    expect(wrapper.findComponent(GalleryView).exists()).toBe(false);
    await wrapper.findComponent(Media).vm.$emit('select', video);
    await wrapper.findComponent(GalleryView).vm.$emit('close');
    expect(wrapper.findComponent(GalleryView).exists()).toBe(false);
  });

  it('opens files with a URL in a new tab', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});
    const wrapper = mountPanel([pdf]);
    const files = wrapper.findComponent(Files);
    await files.vm.$emit('select', pdf);
    expect(open).toHaveBeenCalledWith(
      '/doc.pdf',
      '_blank',
      'noopener,noreferrer'
    );
    await files.vm.$emit('select', { id: 9, file_type: 'file' });
    expect(open).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });
});
