/**
 * OneTeam behaviour spec for a contact's shared media and files.
 *
 * Covers loading the contact's attachments, the spinner and empty state
 * (no attachments, or only locations and missing files), the media and
 * file lists, opening media in the gallery (newest first, media only),
 * opening files in a new tab, and jumping to the message that holds an
 * attachment.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import ContactMedia from '../ContactMedia.vue';

const route = { params: { contactId: 9, accountId: 2 } };
const push = vi.fn();
const dispatch = vi.fn();
const attachments = ref([]);
const uiFlags = ref({ isFetchingAttachments: false });

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ push }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: name =>
    name === 'contacts/getUIFlags'
      ? uiFlags
      : ref(id => (id === 9 ? attachments.value : [])),
}));

const list = name => ({
  name,
  props: {
    attachments: Array,
    peekLimit: Number,
    showJumpToMessage: Boolean,
  },
  emits: ['select', 'jumpToMessage'],
  template: `<div class="${name}" />`,
});
const Media = list('Media');
const Files = list('Files');
const GalleryView = {
  name: 'GalleryView',
  props: ['show', 'attachment', 'allAttachments', 'autoPlay'],
  emits: ['close', 'update:show'],
  template: '<div class="gallery" />',
};

const image = { id: 1, file_type: 'image', data_url: 'a.png', created_at: 1 };
const video = { id: 2, file_type: 'video', data_url: 'b.mp4', created_at: 5 };
const audio = { id: 5, file_type: 'audio', data_url: 'c.mp3' };
const reel = { id: 6, file_type: 'ig_reel', data_url: 'r.mp4' };
const file = {
  id: 3,
  file_type: 'file',
  data_url: 'doc.pdf',
  conversation_id: 7,
  message_id: 70,
};
const location = { id: 4, file_type: 'location', data_url: 'map' };

const mountMedia = () =>
  mount(ContactMedia, {
    global: {
      stubs: {
        Media,
        Files,
        GalleryView,
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });

describe('ContactMedia behaviour', () => {
  beforeEach(() => {
    attachments.value = [reel, image, video, audio, file, location];
    uiFlags.value = { isFetchingAttachments: false };
    vi.clearAllMocks();
  });

  it('loads attachments and shows a spinner or empty state', () => {
    uiFlags.value = { isFetchingAttachments: true };
    expect(mountMedia().find('.spinner').exists()).toBe(true);
    expect(dispatch).toHaveBeenCalledWith('contacts/fetchAttachments', 9);

    uiFlags.value = { isFetchingAttachments: false };
    attachments.value = [location, { id: 6, file_type: 'file' }];
    expect(mountMedia().text()).toBe('CONVERSATION_SIDEBAR.SHARED_FILES.EMPTY');
  });

  it('lists media and files', () => {
    const wrapper = mountMedia();
    expect(wrapper.findComponent(Media).props()).toEqual({
      attachments: attachments.value,
      peekLimit: 12,
      showJumpToMessage: true,
    });
    expect(wrapper.findComponent(Files).props('peekLimit')).toBe(6);
  });

  it('opens media in the gallery, newest first', async () => {
    const wrapper = mountMedia();
    expect(wrapper.find('.gallery').exists()).toBe(false);
    await wrapper.findComponent(Media).vm.$emit('select', image);
    const gallery = wrapper.findComponent(GalleryView);
    expect(gallery.props('attachment')).toEqual(image);
    expect(gallery.props('allAttachments').map(a => a.id)).toEqual([
      2, 1, 6, 5,
    ]);
    await gallery.vm.$emit('close');
    expect(wrapper.find('.gallery').exists()).toBe(false);

    await wrapper.findComponent(Media).vm.$emit('select', video);
    await wrapper.findComponent(GalleryView).vm.$emit('update:show', false);
    expect(wrapper.find('.gallery').exists()).toBe(false);
  });

  it('opens files in a new tab', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});
    const wrapper = mountMedia();
    await wrapper.findComponent(Files).vm.$emit('select', file);
    await wrapper.findComponent(Files).vm.$emit('select', { id: 8 });
    expect(open.mock.calls).toEqual([
      ['doc.pdf', '_blank', 'noopener,noreferrer'],
    ]);
    open.mockRestore();
  });

  it('jumps to the message holding an attachment', async () => {
    const wrapper = mountMedia();
    await wrapper.findComponent(Files).vm.$emit('jumpToMessage', file);
    await wrapper.findComponent(Media).vm.$emit('jumpToMessage', image);
    await wrapper
      .findComponent(Media)
      .vm.$emit('jumpToMessage', { conversation_id: 7 });
    expect(push.mock.calls).toEqual([
      [
        {
          name: 'inbox_conversation',
          params: { accountId: 2, conversation_id: 7 },
          query: { messageId: 70 },
        },
      ],
    ]);
  });
});
