/**
 * OneTeam behaviour spec for the Year in Review share modal.
 *
 * `html-to-image`, `Image`, canvas, `fetch` and the Web Share API are
 * faked. Covers generating the framed image (slide element or component,
 * background colours, failures), the loading state, downloading,
 * sharing with a download fallback, and closing.
 */
/* eslint-disable no-console -- the modal reports failures with console.error */
import { mount, flushPromises } from '@vue/test-utils';
import ShareModal from '../ShareModal.vue';

const env = vi.hoisted(() => ({}));

vi.mock('html-to-image', () => ({
  toPng: (...args) => env.toPng(...args),
}));

class FakeImage {
  width = 200;

  height = 100;

  set src(value) {
    this.source = value;
    setTimeout(() => {
      if (env.imageFails && value.startsWith('data:'))
        this.onerror?.(new Error('bad'));
      else this.onload?.();
    });
  }

  get src() {
    return this.source;
  }
}

const ctx = () => ({
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
});

const mountModal = (props = {}) =>
  mount(ShareModal, {
    props: {
      slideBackground: 'bg-[#60a5fa]',
      year: 2025,
      show: true,
      ...props,
    },
    attachTo: document.body,
  });

const settle = () => vi.waitFor(() => expect(env.busy()).toBe(false));
const overlay = () => document.body.querySelector('.fixed');
const img = () => document.body.querySelector('img');
const buttons = () => [...document.body.querySelectorAll('button')];

describe('Year in Review ShareModal behaviour', () => {
  let wrapper;

  beforeEach(() => {
    env.imageFails = false;
    env.toPng = vi.fn(() => Promise.resolve('data:image/png;base64,AAA'));
    env.ctx = ctx();
    vi.stubGlobal('Image', FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => env.ctx
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,FINAL'
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    env.click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function click() {
        env.clicked = { href: this.href, download: this.download };
      });
    env.busy = () => !!document.body.querySelector('.animate-spin');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ blob: () => Promise.resolve(new Blob(['x'])) })
      )
    );
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete navigator.share;
    delete navigator.canShare;
    env.clicked = null;
  });

  const generate = async (props = {}) => {
    const slide = document.createElement('div');
    wrapper = mountModal({ slideElement: slide, ...props });
    await wrapper.vm.handleOpen();
    await flushPromises();
    return slide;
  };

  it('renders nothing while hidden and does not generate', async () => {
    wrapper = mountModal({ show: false, slideElement: {} });
    await wrapper.vm.handleOpen();
    expect(overlay()).toBe(null);
    expect(env.toPng).not.toHaveBeenCalled();
  });

  it('does nothing without a slide element', async () => {
    wrapper = mountModal();
    await wrapper.vm.handleOpen();
    expect(env.toPng).not.toHaveBeenCalled();
    expect(img()).toBe(null);
  });

  it('frames the slide with branding and shows it', async () => {
    const slide = await generate();
    expect(env.toPng).toHaveBeenCalledWith(slide, {
      pixelRatio: 1.2,
      backgroundColor: '#60a5fa',
      fontEmbedCSS: '',
      cacheBust: true,
    });
    expect(env.ctx.fillRect).toHaveBeenCalledWith(0, 0, 240, 190);
    expect(env.ctx.fillText).toHaveBeenCalledWith(
      'YEAR_IN_REVIEW.SHARE_MODAL.BRANDING',
      20,
      155
    );
    expect(env.ctx.drawImage).toHaveBeenLastCalledWith(
      expect.any(FakeImage),
      160,
      135,
      60,
      30
    );
    expect(img().getAttribute('src')).toBe('data:image/png;base64,FINAL');
    expect(document.body.textContent).toContain(
      'YEAR_IN_REVIEW.SHARE_MODAL.TITLE'
    );

    // Opening again reuses the image.
    await wrapper.vm.handleOpen();
    expect(env.toPng).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner while preparing and unwraps components', async () => {
    let finish;
    env.toPng = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const el = document.createElement('section');
    wrapper = mountModal({
      slideElement: { $el: el },
      slideBackground: 'bg-unknown',
    });
    const pending = wrapper.vm.handleOpen();
    await flushPromises();
    expect(env.busy()).toBe(true);
    expect(document.body.textContent).toContain(
      'YEAR_IN_REVIEW.SHARE_MODAL.PREPARING'
    );
    expect(env.toPng).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ backgroundColor: '#ffffff' })
    );
    finish('data:image/png;base64,AAA');
    await pending;
    await flushPromises();
    expect(img()).not.toBe(null);
  });

  it('logs and stops when the component has no element', async () => {
    wrapper = mountModal({ slideElement: { $el: null } });
    await wrapper.vm.handleOpen();
    await flushPromises();
    expect(console.error).toHaveBeenCalledWith('No slide element found');
    expect(env.busy()).toBe(false);
    expect(img()).toBe(null);
  });

  it.each([
    [
      'rendering fails',
      () => {
        env.toPng = vi.fn(() => Promise.reject(new Error('cors')));
      },
    ],
    [
      'the image cannot load',
      () => {
        env.imageFails = true;
      },
    ],
  ])('logs when %s', async (_, setup) => {
    setup();
    await generate();
    await settle();
    expect(console.error).toHaveBeenCalledWith(
      'Failed to generate image:',
      expect.anything()
    );
    expect(img()).toBe(null);
  });

  it('downloads the image', async () => {
    await generate();
    buttons()[1].click();
    expect(env.clicked).toEqual({
      href: 'data:image/png;base64,FINAL',
      download: 'chatwoot-year-in-review-2025.png',
    });
  });

  it('shares the image when the browser supports file sharing', async () => {
    navigator.canShare = vi.fn(() => true);
    navigator.share = vi.fn(() => Promise.resolve());
    await generate();
    buttons()[2].click();
    await vi.waitFor(() => expect(navigator.share).toHaveBeenCalled());
    const [data] = navigator.share.mock.calls[0];
    expect(data.title).toBe('YEAR_IN_REVIEW.SHARE_MODAL.SHARE_TITLE');
    expect(data.text).toBe('YEAR_IN_REVIEW.SHARE_MODAL.SHARE_TEXT');
    expect(data.files[0].name).toBe('chatwoot-year-in-review-2025.png');
    expect(env.clicked).toBeFalsy();
  });

  it.each([
    ['sharing is unsupported', () => {}],
    [
      'files cannot be shared',
      () => {
        navigator.share = vi.fn();
        navigator.canShare = vi.fn(() => false);
      },
    ],
    [
      'canShare is missing',
      () => {
        navigator.share = vi.fn();
      },
    ],
    [
      'sharing fails',
      () => {
        navigator.canShare = vi.fn(() => true);
        navigator.share = vi.fn(() => Promise.reject(new Error('AbortError')));
      },
    ],
  ])('downloads instead when %s', async (_, setup) => {
    setup();
    await generate();
    buttons()[2].click();
    await vi.waitFor(() => expect(env.clicked).toBeTruthy());
  });

  it('closes from the backdrop or the close button, not from the card', async () => {
    await generate();
    document.body.querySelector('.bg-slate-800').click();
    expect(wrapper.emitted('close')).toBeUndefined();
    buttons()[0].click();
    expect(wrapper.emitted('close')).toHaveLength(1);
    await flushPromises();
    expect(img()).toBe(null);
    overlay().click();
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
