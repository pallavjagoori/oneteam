/**
 * OneTeam behaviour spec for the audio attachment player chip.
 *
 * Media element playback is faked on the jsdom audio element. Covers
 * play and pause (pausing other players), durations from metadata and
 * from streamed recordings without a length, seeking, the time display,
 * playback speed, mute, downloading, and the long transcript toggle.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { downloadFile } from '@chatwoot/utils';
import { emitter } from 'shared/helpers/mitt';
import AudioChip from '../Audio.vue';

vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  downloadFile: vi.fn(),
}));

const attachment = {
  dataUrl: 'https://cdn.test/voice.webm',
  fileType: 'audio',
  extension: 'webm',
};

const mountChip = (props = {}) =>
  mount(AudioChip, {
    props: { attachment, ...props },
    attrs: { class: 'extra' },
    global: {
      stubs: { Icon: { props: ['icon'], template: '<i :class="icon" />' } },
    },
  });

const fakeMedia = (el, { duration = NaN, throwOnSeek = false } = {}) => {
  let time = 0;
  Object.defineProperty(el, 'duration', {
    configurable: true,
    get: () => duration,
  });
  Object.defineProperty(el, 'currentTime', {
    configurable: true,
    get: () => time,
    set: value => {
      if (throwOnSeek) throw new Error('not seekable');
      time = value;
    },
  });
  el.play = vi.fn();
  el.pause = vi.fn();
  return {
    setDuration: value => {
      duration = value;
    },
  };
};

const buttons = wrapper => wrapper.findAll('button');
const timeText = wrapper => wrapper.find('.tabular-nums').text();

describe('Audio chip behaviour', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads a known duration at mount and plays, pauses and ends', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(75);
    const wrapper = mountChip();
    await flushPromises();
    const audio = wrapper.find('audio');
    expect(audio.find('source').attributes('src')).toContain('voice.webm');
    expect(wrapper.find('.extra').exists()).toBe(true);
    expect(timeText(wrapper)).toBe('00:00 / 01:15');
    fakeMedia(audio.element, { duration: 75 });

    const emit = vi.spyOn(emitter, 'emit');
    await buttons(wrapper)[0].trigger('click');
    expect(emit).toHaveBeenCalledWith(
      'pause_playing_audio',
      expect.any(Number)
    );
    expect(audio.element.play).toHaveBeenCalled();
    expect(wrapper.find('.i-teenyicons-pause-small-solid').exists()).toBe(true);
    await buttons(wrapper)[0].trigger('click');
    expect(audio.element.pause).toHaveBeenCalled();

    await wrapper.find('input').setValue('30');
    expect(timeText(wrapper)).toBe('00:30 / 01:15');
    audio.element.currentTime = 61;
    await audio.trigger('timeupdate');
    expect(timeText(wrapper)).toBe('01:01 / 01:15');

    await buttons(wrapper)[1].trigger('click');
    await buttons(wrapper)[1].trigger('click');
    expect(buttons(wrapper)[1].text()).toBe('2x');
    expect(audio.element.playbackRate).toBe(2);
    await buttons(wrapper)[1].trigger('click');
    expect(buttons(wrapper)[1].text()).toBe('1x');
    await buttons(wrapper)[1].trigger('click');
    await audio.trigger('ended');
    expect(buttons(wrapper)[1].text()).toBe('1x');
    expect(audio.element.playbackRate).toBe(1);
    expect(timeText(wrapper)).toBe('00:00 / 01:15');
  });

  it('works out the length of streamed recordings', async () => {
    const wrapper = mountChip();
    const audio = wrapper.find('audio');
    const media = fakeMedia(audio.element);
    await audio.trigger('loadedmetadata');
    expect(audio.element.currentTime).toBe(Number.MAX_SAFE_INTEGER);
    media.setDuration(42);
    await audio.trigger('timeupdate');
    expect(audio.element.currentTime).toBe(0);
    expect(timeText(wrapper)).toMatch(/ \/ 00:42$/);

    media.setDuration(90);
    await audio.trigger('loadedmetadata');
    expect(timeText(wrapper)).toMatch(/ \/ 01:30$/);
  });

  it('gives up when the recording cannot be seeked', async () => {
    const wrapper = mountChip();
    const audio = wrapper.find('audio');
    fakeMedia(audio.element, { throwOnSeek: true });
    const remove = vi.spyOn(audio.element, 'removeEventListener');
    await audio.trigger('loadedmetadata');
    expect(remove).toHaveBeenCalledWith('timeupdate', expect.any(Function));
    expect(timeText(wrapper)).toBe('00:00 / 00:00');
  });

  it('pauses when another player starts', async () => {
    const wrapper = mountChip();
    const audio = wrapper.find('audio');
    fakeMedia(audio.element);
    emitter.emit('pause_playing_audio', -1);
    expect(audio.element.pause).not.toHaveBeenCalled();

    await buttons(wrapper)[0].trigger('click');
    emitter.emit('pause_playing_audio', -1);
    await flushPromises();
    expect(audio.element.pause).toHaveBeenCalled();
    expect(wrapper.find('.i-teenyicons-play-small-solid').exists()).toBe(true);

    await buttons(wrapper)[0].trigger('click');
    audio.element.pause.mockImplementation(() => {
      throw new Error('gone');
    });
    emitter.emit('pause_playing_audio', -1);
    await flushPromises();
    expect(wrapper.find('.i-teenyicons-play-small-solid').exists()).toBe(true);
    wrapper.unmount();
  });

  it('mutes and downloads', async () => {
    const wrapper = mountChip();
    await buttons(wrapper)[2].trigger('click');
    expect(wrapper.find('.i-lucide-volume-off').exists()).toBe(true);
    await buttons(wrapper)[2].trigger('click');
    expect(wrapper.find('.i-lucide-volume-2').exists()).toBe(true);
    await buttons(wrapper)[3].trigger('click');
    expect(downloadFile).toHaveBeenCalledWith({
      url: 'https://cdn.test/voice.webm',
      type: 'audio',
      extension: 'webm',
    });
  });

  it('shows short and long transcripts', async () => {
    expect(
      mountChip({ attachment: { ...attachment, transcribedText: 'Hi' } }).text()
    ).toContain('Hi');
    expect(
      mountChip({
        attachment: { ...attachment, transcribedText: 'Hi' },
        showTranscribedText: false,
      }).text()
    ).not.toContain('Hi');

    const long = `${'word '.repeat(60)}end`;
    const wrapper = mountChip({
      attachment: { ...attachment, transcribedText: long },
    });
    const transcript = () => wrapper.find('.bg-n-alpha-1');
    expect(transcript().text()).toContain('…');
    expect(transcript().text()).not.toContain('end');
    await transcript().find('button').trigger('click');
    expect(transcript().text()).toContain('end');
    expect(transcript().find('button').text()).toBe(
      'CONVERSATION.VOICE_CALL.TRANSCRIPT_SHOW_LESS'
    );
    await transcript().find('button').trigger('click');
    expect(transcript().find('button').text()).toBe(
      'CONVERSATION.VOICE_CALL.TRANSCRIPT_SHOW_MORE'
    );
  });
});
