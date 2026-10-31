/* eslint-disable max-classes-per-file */
/**
 * OneTeam specs for converting voice recordings to WAV, MP3 or OGG before
 * they are sent. The browser's audio decoder is replaced by a fake that
 * returns a short stereo buffer.
 */
import {
  convertAudio,
  convertToMp3,
  convertToWav,
  encodeToMP3,
} from '../audioConversionUtils';
import { remuxWebmToOgg } from '../webmOpusToOgg';

// Browsers give Blob an arrayBuffer() method; jsdom's Blob lacks it.
if (!Blob.prototype.arrayBuffer) {
  // eslint-disable-next-line func-names
  Blob.prototype.arrayBuffer = function () {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(this);
    });
  };
}

vi.mock('../webmOpusToOgg', () => ({
  remuxWebmToOgg: vi.fn(async () => new Blob(['ogg'], { type: 'audio/ogg' })),
}));

const channelData = [
  new Float32Array([0, 0.5, -0.5, 2]),
  new Float32Array([1, -1, -2, 0.25]),
];
const stereoBuffer = {
  length: 4,
  numberOfChannels: 2,
  sampleRate: 44100,
  getChannelData: channel => channelData[channel],
};
const monoBuffer = { ...stereoBuffer, numberOfChannels: 1 };
let fakeBuffer = stereoBuffer;

describe('audio conversion', () => {
  beforeEach(() => {
    fakeBuffer = monoBuffer;
    window.AudioContext = class {
      // eslint-disable-next-line class-methods-use-this
      decodeAudioData() {
        return Promise.resolve(fakeBuffer);
      }
    };
  });

  it('writes a 16-bit PCM WAV file with interleaved, clipped samples', async () => {
    fakeBuffer = stereoBuffer;
    const wav = await convertToWav(new Blob(['raw']));
    const view = new DataView(await wav.arrayBuffer());
    const text = (offset, length) =>
      String.fromCharCode(...new Uint8Array(view.buffer, offset, length));

    expect(wav.type).toBe('audio/wav');
    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 8)).toBe('WAVEfmt ');
    expect(text(36, 4)).toBe('data');
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint32(40, true)).toBe(16);
    const samples = Array.from({ length: 8 }, (_, i) =>
      view.getInt16(44 + i * 2, true)
    );
    expect(samples).toEqual([
      0, 32767, 16383, -32767, -16383, -32767, 32767, 8191,
    ]);
  });

  it('falls back to webkitAudioContext on older Safari', async () => {
    window.webkitAudioContext = window.AudioContext;
    delete window.AudioContext;

    const wav = await convertToWav(new Blob(['raw']));

    expect(wav.type).toBe('audio/wav');
    delete window.webkitAudioContext;
  });

  it('encodes MP3 frames, including the final flush', () => {
    const samples = new Int16Array(3000).fill(1000);

    const mp3 = encodeToMP3(1, 44100, samples);

    expect(mp3.type).toBe('audio/mp3');
    expect(mp3.size).toBeGreaterThan(0);
  });

  it('converts a recording to MP3', async () => {
    const mp3 = await convertToMp3(new Blob(['raw']), 64);

    expect(mp3.type).toBe('audio/mp3');
  });

  it('fails to convert stereo recordings to MP3 (see FINDINGS.md)', async () => {
    fakeBuffer = stereoBuffer;

    await expect(convertToMp3(new Blob(['raw']))).rejects.toThrow(
      'Conversion to MP3 failed.'
    );
  });

  it('reports MP3 conversion failures plainly', async () => {
    window.AudioContext = class {
      // eslint-disable-next-line class-methods-use-this
      decodeAudioData() {
        return Promise.reject(new Error('corrupt'));
      }
    };

    await expect(convertToMp3(new Blob(['raw']))).rejects.toThrow(
      'Conversion to MP3 failed.'
    );
  });

  it('picks the converter for each output format', async () => {
    expect((await convertAudio(new Blob(['raw']), 'audio/wav')).type).toBe(
      'audio/wav'
    );
    expect((await convertAudio(new Blob(['raw']), 'audio/mp3')).type).toBe(
      'audio/mp3'
    );
    await expect(convertAudio(new Blob(['raw']), 'audio/flac')).rejects.toThrow(
      'Unsupported output format'
    );
  });

  it('remuxes WebM to OGG, keeps OGG, and falls back to MP3 for other recordings', async () => {
    const webm = new Blob(['webm'], { type: 'audio/webm;codecs=opus' });
    const videoWebm = new Blob(['webm'], { type: 'video/webm' });
    const ogg = new Blob(['ogg'], { type: 'audio/ogg; codecs=opus' });
    const mp4 = new Blob(['mp4'], { type: 'audio/mp4' });

    expect((await convertAudio(webm, 'audio/ogg')).type).toBe('audio/ogg');
    expect((await convertAudio(videoWebm, 'audio/ogg')).type).toBe('audio/ogg');
    expect(await convertAudio(ogg, 'audio/ogg')).toBe(ogg);
    expect((await convertAudio(mp4, 'audio/ogg')).type).toBe('audio/mp3');
    expect(remuxWebmToOgg).toHaveBeenCalledTimes(2);
  });
});
