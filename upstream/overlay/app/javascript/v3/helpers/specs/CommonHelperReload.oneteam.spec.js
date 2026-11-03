/**
 * Covers replaceRouteWithReload, which hands navigation to the browser.
 */
import { replaceRouteWithReload } from '../CommonHelper';

describe('replaceRouteWithReload', () => {
  it('assigns the URL to window.location', () => {
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {},
    });
    replaceRouteWithReload('/app/login');
    expect(window.location).toBe('/app/login');
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: original,
    });
  });
});
