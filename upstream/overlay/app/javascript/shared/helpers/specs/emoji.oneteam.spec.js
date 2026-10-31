/**
 * OneTeam specs for emoji support detection: the browser draws a koala on a
 * canvas and checks a pixel.
 */
import { hasEmojiSupport, removeEmoji } from '../emoji';

describe('hasEmojiSupport', () => {
  let getContext;

  afterEach(() => {
    getContext?.mockRestore();
  });

  const fakeContext = red => ({
    fillText: vi.fn(),
    getImageData: vi.fn(() => ({ data: [red, 0, 0, 255] })),
  });

  it('is supported when the drawn emoji colours the pixel', () => {
    const context = fakeContext(255);
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context);
    window.devicePixelRatio = 2;

    expect(hasEmojiSupport()).toBe(true);
    expect(context.getImageData).toHaveBeenCalledWith(24, 24, 1, 1);
    expect(context.font).toBe('32px Arial');
  });

  it('is not supported when the pixel stays empty', () => {
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(fakeContext(0));
    window.devicePixelRatio = undefined;

    expect(hasEmojiSupport()).toBe(false);
  });

  it('is not supported without a canvas that can draw text', () => {
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);
    expect(hasEmojiSupport()).toBe(false);

    getContext.mockReturnValue({ fillText: 'no' });
    expect(hasEmojiSupport()).toBe(false);
  });

  it('strips emoji and squeezes spaces', () => {
    expect(removeEmoji('Hello 🐨  world ✨')).toBe('Hello world');
    expect(removeEmoji('')).toBe('');
  });
});
