/**
 * OneTeam specs for loading and playing the alert sound shared by the
 * dashboard and the widget.
 */
import { getAlertAudio, getAudioContext } from '../AudioNotificationHelper';

const flush = () =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
  });

describe('alert sound', () => {
  let source;
  let context;

  beforeEach(() => {
    source = { connect: vi.fn(), start: vi.fn() };
    context = {
      destination: 'speakers',
      createBufferSource: vi.fn(() => source),
      decodeAudioData: vi.fn(() => Promise.resolve('decoded')),
    };
    window.AudioContext = vi.fn(() => context);
    window.Request = vi.fn(url => ({ url }));
    window.fetch = vi.fn(() =>
      Promise.resolve({ arrayBuffer: () => Promise.resolve('bytes') })
    );
    delete window.playAudioAlert;
  });

  it('returns nothing when the browser has no audio support', () => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;

    expect(getAudioContext()).toBeUndefined();
  });

  it('downloads the chosen tone and plays it once on request', async () => {
    await getAlertAudio('https://app.test', {
      type: 'widget',
      alertTone: 'bell',
    });
    await flush();

    expect(window.fetch).toHaveBeenCalledWith({
      url: 'https://app.test/audio/widget/bell.mp3',
    });
    window.playAudioAlert();
    expect(source.buffer).toBe('decoded');
    expect(source.loop).toBe(false);
    expect(source.connect).toHaveBeenCalledWith('speakers');
    expect(source.start).toHaveBeenCalled();
  });

  it('defaults to the dashboard ding', async () => {
    await getAlertAudio();
    await flush();

    expect(window.fetch).toHaveBeenCalledWith({
      url: '/audio/dashboard/ding.mp3',
    });
  });

  it('does nothing without audio support or when the download fails', async () => {
    window.AudioContext = undefined;
    await getAlertAudio('', {});
    expect(window.fetch).not.toHaveBeenCalled();

    window.AudioContext = vi.fn(() => context);
    window.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    await getAlertAudio('', {});
    await flush();
    expect(window.playAudioAlert).toBeUndefined();
  });
});
