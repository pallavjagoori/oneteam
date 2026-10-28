import { useLoadWithRetry } from '../loadWithRetry';

/*
 * OneTeam coverage for useLoadWithRetry, which loads an image and retries
 * with a growing delay. A fake Image class decides per attempt whether the
 * load succeeds, and fake timers skip the delays.
 */
let outcomes = [];

class FakeImage {
  set src(url) {
    this.url = url;
    const ok = outcomes.shift();
    queueMicrotask(() => (ok ? this.onload() : this.onerror()));
  }
}

describe('useLoadWithRetry (OneTeam)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Image', FakeImage);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('loads an image on the first try', async () => {
    outcomes = [true];
    const { isLoaded, hasError, loadWithRetry } = useLoadWithRetry();
    await loadWithRetry('/a.png');
    expect(isLoaded.value).toBe(true);
    expect(hasError.value).toBe(false);
  });

  it('retries after a growing delay until the image loads', async () => {
    outcomes = [false, false, true];
    const { isLoaded, loadWithRetry } = useLoadWithRetry({
      max_retry: 3,
      backoff: 10,
    });
    const done = loadWithRetry('/a.png');
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(20);
    await done;
    expect(isLoaded.value).toBe(true);
  });

  it('gives up after the last attempt', async () => {
    outcomes = [false, false, false];
    const { isLoaded, hasError, loadWithRetry } = useLoadWithRetry();
    const done = loadWithRetry('/a.png');
    await vi.runAllTimersAsync();
    await done;
    expect(hasError.value).toBe(true);
    expect(isLoaded.value).toBe(false);
  });
});
