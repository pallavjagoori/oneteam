/**
 * OneTeam behaviour spec for the voice note recorder.
 *
 * Covers creating the waveform with the record plugin (Opus for OGG when
 * the browser supports it), starting on mount, progress updates, play and
 * pause events, finishing a recording (converted type, extension fallback,
 * replacing the previous preview URL), conversion errors, stopping,
 * play/pause only after a recording exists, and cleanup on unmount.
 */
import { mount, flushPromises } from '@vue/test-utils';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.js';
import { convertAudio } from '../utils/audioConversionUtils';
import AudioRecorder from '../AudioRecorder.vue';

const env = vi.hoisted(() => ({}));

vi.mock('widget/helpers/uuid', () => ({ default: () => 'uuid' }));
vi.mock('../utils/audioConversionUtils', () => ({ convertAudio: vi.fn() }));
vi.mock('wavesurfer.js/dist/plugins/record.js', () => ({
  default: { create: vi.fn() },
}));
vi.mock('wavesurfer.js', () => ({ default: { create: vi.fn() } }));

const emitter = () => {
  const handlers = {};
  return {
    handlers,
    on: (event, handler) => {
      handlers[event] = handler;
    },
  };
};

describe('Audio recorder behaviour', () => {
  beforeEach(() => {
    env.record = {
      ...emitter(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
    };
    env.surfer = {
      ...emitter(),
      plugins: [env.record],
      load: vi.fn(),
      playPause: vi.fn(),
      destroy: vi.fn(),
    };
    RecordPlugin.create.mockImplementation(options => {
      env.recordOptions = options;
      return 'plugin';
    });
    WaveSurfer.create.mockImplementation(options => {
      env.surferOptions = options;
      return env.surfer;
    });
    env.supported = true;
    window.MediaRecorder = { isTypeSupported: () => env.supported };
    let n = 0;
    URL.createObjectURL = vi.fn(() => {
      n += 1;
      return `blob:${n}`;
    });
    URL.revokeObjectURL = vi.fn();
  });

  const mountRecorder = (format = 'audio/ogg') =>
    mount(AudioRecorder, { props: { audioRecordFormat: format } });

  it('creates the waveform, uses Opus for OGG and starts recording', () => {
    const wrapper = mountRecorder();
    expect(env.surferOptions.container).toBe(wrapper.element);
    expect(env.surferOptions.plugins).toEqual(['plugin']);
    expect(env.recordOptions).toEqual({
      scrollingWaveform: true,
      renderRecordedAudio: false,
      mimeType: 'audio/ogg;codecs=opus',
    });
    expect(env.record.startRecording).toHaveBeenCalled();
    expect(wrapper.vm.record.startRecording).toBe(env.record.startRecording);
  });

  it('skips the Opus mime type when unsupported or for other formats', () => {
    env.supported = false;
    mountRecorder();
    expect(env.recordOptions).not.toHaveProperty('mimeType');
    env.supported = true;
    mountRecorder('audio/wav');
    expect(env.recordOptions).not.toHaveProperty('mimeType');
  });

  it('reports progress and forwards play and pause', () => {
    const wrapper = mountRecorder();
    env.record.handlers['record-progress'](75000);
    env.surfer.handlers.play();
    env.surfer.handlers.pause();
    env.surfer.handlers.finish();
    expect(wrapper.emitted('recorderProgressChanged')[0]).toEqual(['01:15']);
    expect(wrapper.emitted('play')).toHaveLength(1);
    expect(wrapper.emitted('pause')).toHaveLength(1);
  });

  it('emits the finished recording using the converted type', async () => {
    convertAudio.mockResolvedValue(new Blob(['abc'], { type: 'audio/mpeg' }));
    const wrapper = mountRecorder();
    wrapper.vm.playPause();
    expect(env.surfer.playPause).not.toHaveBeenCalled();
    await env.record.handlers['record-end']('raw');
    expect(convertAudio).toHaveBeenCalledWith('raw', 'audio/ogg');
    const [{ name, type, size, file }] = wrapper.emitted('finishRecord')[0];
    expect({ name, type, size }).toEqual({ name: 'uuid.mp3', type: 'audio/mpeg', size: 3 });
    expect(file).toBeInstanceOf(File);
    expect(env.surfer.load).toHaveBeenCalledWith('blob:1');
    wrapper.vm.playPause();
    expect(env.surfer.playPause).toHaveBeenCalled();
    wrapper.vm.stopRecording();
    expect(env.record.stopRecording).not.toHaveBeenCalled();
  });

  it('falls back to the requested format and to mp3 for unknown types', async () => {
    convertAudio
      .mockResolvedValueOnce(new Blob(['a']))
      .mockResolvedValueOnce(new Blob(['a'], { type: 'audio/aac' }));
    const wrapper = mountRecorder('audio/webm');
    await env.record.handlers['record-end']('raw');
    await env.record.handlers['record-end']('raw');
    const names = wrapper.emitted('finishRecord').map(([e]) => e.name);
    expect(names).toEqual(['uuid.webm', 'uuid.mp3']);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
    wrapper.unmount();
    expect(URL.revokeObjectURL).toHaveBeenLastCalledWith('blob:2');
    expect(env.surfer.destroy).toHaveBeenCalled();
  });

  it('reports conversion errors', async () => {
    const error = new Error('bad audio');
    convertAudio.mockRejectedValue(error);
    const wrapper = mountRecorder();
    await env.record.handlers['record-end']('raw');
    await flushPromises();
    expect(wrapper.emitted('recordError')[0]).toEqual([{ error }]);
    wrapper.vm.stopRecording();
    expect(env.record.stopRecording).not.toHaveBeenCalled();
  });

  it('stops an active recording once', () => {
    const wrapper = mountRecorder();
    wrapper.vm.stopRecording();
    wrapper.vm.stopRecording();
    expect(env.record.stopRecording).toHaveBeenCalledTimes(1);
  });

  it('cleans up without a recording', () => {
    mountRecorder().unmount();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(env.surfer.destroy).toHaveBeenCalledTimes(1);
  });
});
