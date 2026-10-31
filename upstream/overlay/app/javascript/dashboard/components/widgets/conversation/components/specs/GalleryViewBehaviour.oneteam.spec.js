/**
 * OneTeam behaviour spec for the attachment gallery viewer.
 *
 * Covers opening on the clicked attachment, image/video/reel/audio
 * modes, ignoring unsupported files, sender name/avatar fallbacks
 * ("You" for the current user), the timestamp and file name, zoom and
 * rotate controls, previous/next buttons and arrow keys (stopping at
 * the ends), downloading (success, failure, unsupported), and closing
 * by button, Escape or backdrop click.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { downloadFile } from '@chatwoot/utils';
import { useAlert } from 'dashboard/composables';
import GalleryView from '../GalleryView.vue';

const env = vi.hoisted(() => ({}));

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', async () => {
  const { computed } = await import('vue');
  return {
    useStoreGetters: () => ({ getCurrentUser: computed(() => ({ id: 1 })) }),
  };
});
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: events => {
    env.keys = events;
  },
}));
vi.mock('dashboard/composables/useImageZoom', async () => {
  const { ref } = await import('vue');
  return {
    useImageZoom: () => {
      env.zoom = {
        imageWrapperStyle: {},
        imageStyle: {},
        activeImageRotation: ref(0),
        onRotate: vi.fn(),
        onZoom: vi.fn(),
        onDoubleClickZoomImage: vi.fn(),
        onWheelImageZoom: vi.fn(),
        onMouseMove: vi.fn(),
        onMouseLeave: vi.fn(),
        resetZoomAndRotation: vi.fn(),
      };
      return env.zoom;
    },
  };
});
vi.mock('shared/helpers/timeHelper', () => ({
  messageTimestamp: ts => (ts === 1 ? '' : `time-${ts}`),
}));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  downloadFile: vi.fn(),
}));

const NextButton = {
  name: 'NextButton',
  props: ['icon', 'disabled', 'isLoading'],
  template: '<button :data-icon="icon" :disabled="disabled" />',
};

const image = (id, extra = {}) => ({
  message_id: id,
  file_type: 'image',
  data_url: `https://cdn/x/photo%20${id}.png`,
  created_at: 100 + id,
  extension: 'png',
  sender: { id: 2, name: 'Ana', thumbnail: 't.png' },
  ...extra,
});

const mountGallery = (attachment, all) =>
  mount(GalleryView, {
    props: { attachment, allAttachments: all, show: true },
    global: {
      stubs: {
        NextButton,
        Avatar: { props: ['name', 'src'], template: '<i class="avatar" />' },
        TeleportWithDirection: { template: '<div><slot /></div>' },
        WootModal: { template: '<div class="modal"><slot /></div>' },
      },
      directives: {
        dompurifyHtml: (el, { value }) => {
          el.textContent = value;
        },
      },
    },
  });

const icon = (wrapper, name) => wrapper.find(`[data-icon="${name}"]`);
const PREV = 'ltr:i-lucide-chevron-left rtl:i-lucide-chevron-right';
const NEXT = 'ltr:i-lucide-chevron-right rtl:i-lucide-chevron-left';

describe('GalleryView behaviour', () => {
  it('opens on the clicked image with its details', async () => {
    const all = [image(1), image(2), image(3)];
    const wrapper = mountGallery(all[1], all);
    await flushPromises();
    expect(wrapper.find('img').attributes('src')).toBe(all[1].data_url);
    expect(wrapper.text()).toContain('Ana');
    expect(wrapper.text()).toContain('time-102');
    expect(wrapper.text()).toContain('photo 2.png');
    expect(wrapper.text()).toContain('2 / 3');
    expect(wrapper.find('.avatar').exists()).toBe(true);
    expect(wrapper.find('.size-full').exists()).toBe(true);
  });

  it('zooms and rotates images', async () => {
    const wrapper = mountGallery(image(1), [image(1)]);
    await flushPromises();
    await icon(wrapper, 'i-lucide-zoom-in').trigger('click');
    await icon(wrapper, 'i-lucide-zoom-out').trigger('click');
    await icon(wrapper, 'i-lucide-rotate-ccw').trigger('click');
    await icon(wrapper, 'i-lucide-rotate-cw').trigger('click');
    expect(env.zoom.onZoom.mock.calls).toEqual([[0.1], [-0.1]]);
    expect(env.zoom.onRotate.mock.calls).toEqual([
      ['counter-clockwise'],
      ['clockwise'],
    ]);
    const img = wrapper.find('img');
    await img.trigger('dblclick');
    await img.trigger('wheel');
    await img.trigger('mousemove');
    await img.trigger('mouseleave');
    await img.trigger('click');
    expect(env.zoom.onDoubleClickZoomImage).toHaveBeenCalled();
    expect(env.zoom.onWheelImageZoom).toHaveBeenCalled();
    expect(env.zoom.onMouseMove).toHaveBeenCalled();
    expect(env.zoom.onMouseLeave).toHaveBeenCalled();
    expect(wrapper.emitted('close')).toBeUndefined();
    env.zoom.activeImageRotation.value = 90;
    await flushPromises();
    expect(wrapper.find('.size-full').exists()).toBe(false);
    expect(icon(wrapper, PREV).exists()).toBe(false);
  });

  it('plays videos, reels and audio', async () => {
    let wrapper = mountGallery(image(1, { file_type: 'video' }), [image(1)]);
    await flushPromises();
    expect(wrapper.find('video').exists()).toBe(true);
    expect(icon(wrapper, 'i-lucide-zoom-in').exists()).toBe(false);
    await wrapper.find('video').trigger('click');
    wrapper = mountGallery(image(1, { file_type: 'ig_reel' }), [image(1)]);
    await flushPromises();
    expect(wrapper.find('video').exists()).toBe(true);
    wrapper = mountGallery(image(1, { file_type: 'audio' }), [image(1)]);
    await flushPromises();
    expect(wrapper.find('audio source').attributes('src')).toContain(
      'photo%201.png?t='
    );
    await wrapper.find('audio').trigger('click');
    expect(wrapper.emitted('close')).toBeUndefined();
    wrapper = mountGallery(image(1, { file_type: 'file' }), [image(1)]);
    await flushPromises();
    expect(wrapper.find('img, video, audio').exists()).toBe(false);
  });

  it('falls back for sender, time and file name', async () => {
    let wrapper = mountGallery(
      image(1, {
        sender: { id: 1, avatar_url: 'a.png' },
        created_at: 1,
        data_url: 'https://cdn/x/',
      }),
      [image(1)]
    );
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe('You');
    expect(wrapper.find('.avatar').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('time-');

    wrapper = mountGallery(
      image(1, {
        sender: { available_name: 'Bo' },
        created_at: undefined,
        data_url: undefined,
      }),
      [image(1)]
    );
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe('Bo');
    expect(wrapper.find('.avatar').exists()).toBe(false);

    wrapper = mountGallery(image(1, { sender: undefined, file_type: 'file' }), [
      image(1),
    ]);
    await flushPromises();
    expect(wrapper.find('h3').text()).toBe('');
  });

  it('moves between attachments with buttons and keys', async () => {
    const all = [image(1), image(2), image(3)];
    const wrapper = mountGallery(all[0], all);
    await flushPromises();
    expect(icon(wrapper, PREV).attributes('disabled')).toBeDefined();
    await icon(wrapper, NEXT).trigger('click');
    expect(wrapper.text()).toContain('2 / 3');
    expect(env.zoom.resetZoomAndRotation).toHaveBeenCalled();
    env.keys.ArrowRight.action();
    await flushPromises();
    expect(wrapper.text()).toContain('3 / 3');
    expect(icon(wrapper, NEXT).attributes('disabled')).toBeDefined();
    env.keys.ArrowRight.action();
    await flushPromises();
    expect(wrapper.text()).toContain('3 / 3');
    env.keys.ArrowLeft.action();
    await icon(wrapper, PREV).trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('1 / 3');
    expect(wrapper.find('img').attributes('src')).toBe(all[0].data_url);
    env.keys.ArrowLeft.action();
    await flushPromises();
    expect(wrapper.text()).toContain('1 / 3');
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('downloads the current attachment', async () => {
    const wrapper = mountGallery(image(1), [image(1)]);
    await flushPromises();
    downloadFile.mockResolvedValueOnce();
    await icon(wrapper, 'i-lucide-download').trigger('click');
    await flushPromises();
    expect(downloadFile).toHaveBeenCalledWith({
      url: image(1).data_url,
      type: 'image',
      extension: 'png',
    });
    downloadFile.mockRejectedValueOnce(new Error('down'));
    await icon(wrapper, 'i-lucide-download').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      expect.stringContaining('GALLERY_VIEW.ERROR_DOWNLOADING')
    );
    expect(
      icon(wrapper, 'i-lucide-download').attributes('disabled')
    ).toBeUndefined();

    downloadFile.mockClear();
    const unsupported = mountGallery(image(1, { file_type: 'file' }), [
      image(1),
    ]);
    await flushPromises();
    await icon(unsupported, 'i-lucide-download').trigger('click');
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it('closes by button, Escape or backdrop', async () => {
    const wrapper = mountGallery(image(1), [image(1)]);
    await flushPromises();
    await icon(wrapper, 'i-lucide-x').trigger('click');
    env.keys.Escape.action();
    await wrapper.find('.modal > div').trigger('click');
    await wrapper.find('header').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(3);
  });
});
