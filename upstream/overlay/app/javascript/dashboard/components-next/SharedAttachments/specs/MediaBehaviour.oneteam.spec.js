/**
 * OneTeam behaviour spec for the shared media grid in the conversation
 * sidebar.
 *
 * Covers filtering and sorting media, the peek limit with its overflow
 * tile and view-all toggle, thumbnail fallbacks after load errors,
 * video and audio durations, timestamps, downloading (and failures),
 * selecting tiles by click and keyboard, and jumping to the message.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { downloadFile } from '@chatwoot/utils';
import { useAlert } from 'dashboard/composables';
import Media from '../Media.vue';

vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  downloadFile: vi.fn(),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => value => `exact ${value}`,
}));
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: value => `dyn ${value}`,
  shortTimestamp: value => `short ${value}`,
  formatDuration: value => `${value}s`,
}));

const NextButton = {
  name: 'NextButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button class="toggle">{{ label }}</button>',
};

const image = {
  id: 1,
  file_type: 'image',
  data_url: '/f/a%20b.png',
  thumb_url: '/t/1',
  created_at: 30,
  message_id: 7,
};
const video = {
  id: 2,
  file_type: 'video',
  data_url: '/f/v.mp4',
  thumb_url: '/t/2',
  created_at: 20,
};
const reel = {
  id: 3,
  file_type: 'ig_reel',
  data_url: '/f/r.mp4',
  created_at: 10,
};
const audio = { id: 4, file_type: 'audio', data_url: '/f/s.mp3' };
const file = { id: 5, file_type: 'file', data_url: '/f/doc.pdf' };
const noUrl = { id: 6, file_type: 'image' };

const mountMedia = props =>
  mount(Media, {
    props: { attachments: [audio, reel, image, video, file, noUrl], ...props },
    global: {
      stubs: {
        NextButton,
        Icon: { props: ['icon'], template: '<i :class="icon" />' },
      },
      directives: { tooltip: {} },
    },
  });

const tiles = wrapper => wrapper.findAll('[role="button"]');

describe('Shared media behaviour', () => {
  it('renders nothing without media', () => {
    expect(mount(Media).find('section').exists()).toBe(false);
  });

  it('lists media newest first with previews and fallbacks', () => {
    const wrapper = mountMedia({ showJumpToMessage: true });
    expect(wrapper.find('h4').text()).toContain('4');
    expect(wrapper.find('.toggle').exists()).toBe(false);
    const [imageTile, videoTile, reelTile, audioTile] = tiles(wrapper);
    expect(imageTile.find('img').attributes()).toMatchObject({
      src: '/t/1',
      alt: 'a b.png',
    });
    expect(imageTile.text()).toContain('short dyn 30');
    expect(imageTile.find('.i-lucide-external-link').exists()).toBe(true);
    expect(videoTile.find('img').attributes('src')).toBe('/t/2');
    expect(videoTile.find('.i-lucide-play').exists()).toBe(true);
    expect(videoTile.find('.i-lucide-external-link').exists()).toBe(false);
    expect(reelTile.find('video').attributes('src')).toBe('/f/r.mp4#t=0.1');
    expect(audioTile.find('.i-lucide-music').exists()).toBe(true);
    expect(audioTile.find('audio').exists()).toBe(true);
    expect(audioTile.text()).toBe('');
  });

  it('falls back from thumbnails to full files, then to icons', async () => {
    const wrapper = mountMedia();
    let [imageTile, videoTile] = tiles(wrapper);
    await imageTile.find('img').trigger('error');
    expect(imageTile.find('img').attributes('src')).toBe('/f/a%20b.png');
    await imageTile.find('img').trigger('error');
    expect(imageTile.find('img').exists()).toBe(false);
    expect(imageTile.find('.i-lucide-image').exists()).toBe(true);

    await videoTile.find('img').trigger('error');
    expect(videoTile.find('video').exists()).toBe(true);
    await videoTile.find('video').trigger('error');
    [, videoTile] = tiles(wrapper);
    expect(videoTile.find('.i-lucide-video').exists()).toBe(true);
  });

  it('gives up on media without a usable preview', async () => {
    const wrapper = mountMedia({
      attachments: [
        { id: 9, file_type: 'image', data_url: '/f/x.png' },
        { id: 10, file_type: 'audio', data_url: '/f/y.mp3', thumb_url: '/t/y' },
        { id: 11, file_type: 'image', data_url: '/f/' },
      ],
    });
    await tiles(wrapper)[0].find('img').trigger('error');
    expect(tiles(wrapper)[0].find('.i-lucide-image').exists()).toBe(true);
    // Audio never shows a picture, whatever thumbnail it has.
    expect(tiles(wrapper)[1].find('img').exists()).toBe(false);
    expect(tiles(wrapper)[2].find('img').attributes('alt')).toBe('');
  });

  it('shows durations once media metadata loads', async () => {
    const wrapper = mountMedia();
    const reelVideo = tiles(wrapper)[2].find('video');
    Object.defineProperty(reelVideo.element, 'duration', { value: 61.6 });
    await reelVideo.trigger('loadedmetadata');
    expect(tiles(wrapper)[2].text()).toContain('62s');

    const audioEl = tiles(wrapper)[3].find('audio');
    Object.defineProperty(audioEl.element, 'duration', { value: Infinity });
    await audioEl.trigger('loadedmetadata');
    expect(tiles(wrapper)[3].text()).toBe('');
  });

  it('peeks at a few tiles and expands from the overflow tile or button', async () => {
    const wrapper = mountMedia({ peekLimit: 3 });
    expect(tiles(wrapper)).toHaveLength(3);
    expect(tiles(wrapper)[2].text()).toContain(
      'CONVERSATION_SIDEBAR.SHARED_FILES.MORE_COUNT'
    );
    expect(wrapper.find('.toggle').text()).toBe(
      'CONVERSATION_SIDEBAR.SHARED_FILES.VIEW_ALL'
    );
    await tiles(wrapper)[2].trigger('click');
    expect(tiles(wrapper)).toHaveLength(4);
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(wrapper.find('.toggle').text()).toBe(
      'CONVERSATION_SIDEBAR.SHARED_FILES.SHOW_LESS'
    );
    await wrapper.findComponent(NextButton).vm.$emit('click');
    expect(tiles(wrapper)).toHaveLength(3);
  });

  it('skips the overflow tile when everything fits', () => {
    const wrapper = mountMedia({ peekLimit: 6 });
    expect(tiles(wrapper)).toHaveLength(4);
    expect(wrapper.find('.toggle').exists()).toBe(false);
  });

  it('selects tiles by click and keyboard and jumps to messages', async () => {
    const wrapper = mountMedia({ showJumpToMessage: true });
    await tiles(wrapper)[0].trigger('click');
    await tiles(wrapper)[1].trigger('keydown', { key: 'Enter' });
    await tiles(wrapper)[2].trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('select').map(([a]) => a.id)).toEqual([1, 2, 3]);
    await tiles(wrapper)[0]
      .find('[aria-label$="JUMP_TO_MESSAGE"]')
      .trigger('click');
    expect(wrapper.emitted('jumpToMessage')[0][0].id).toBe(1);
    // Keys on the corner buttons stay on the buttons.
    await Promise.all(
      ['JUMP_TO_MESSAGE', 'DOWNLOAD'].flatMap(label => {
        const corner = tiles(wrapper)[0].find(`[aria-label$="${label}"]`);
        return [
          corner.trigger('keydown', { key: 'Enter' }),
          corner.trigger('keydown', { key: ' ' }),
        ];
      })
    );
    expect(wrapper.emitted('select')).toHaveLength(3);
  });

  it('downloads files and reports failures', async () => {
    const wrapper = mountMedia();
    const button = () => tiles(wrapper)[0].find('[aria-label$="DOWNLOAD"]');
    let finish;
    downloadFile.mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    await button().trigger('click');
    expect(downloadFile).toHaveBeenCalledWith({
      url: '/f/a%20b.png',
      type: 'image',
      extension: undefined,
    });
    expect(button().attributes('disabled')).toBeDefined();
    finish();
    await flushPromises();
    expect(button().attributes('disabled')).toBeUndefined();

    downloadFile.mockRejectedValueOnce(new Error('no'));
    await button().trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CONVERSATION_SIDEBAR.SHARED_FILES.DOWNLOAD_ERROR'
    );
    expect(wrapper.emitted('select')).toBeUndefined();
  });
});
