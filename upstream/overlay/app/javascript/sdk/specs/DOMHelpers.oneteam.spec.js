/**
 * OneTeam specs for the website SDK's DOM helpers: the widget's styles,
 * Turbo page swaps and the page-change listener that tells the widget which
 * page the visitor is on.
 */
import {
  addClasses,
  loadCSS,
  onLocationChangeListener,
  removeClasses,
  restoreWidgetInDOM,
  toggleClass,
} from '../DOMHelpers';
import { IFrameHelper } from '../IFrameHelper';

// The SDK watches the page for URL changes and never stops; disconnect its
// observers so they don't fire after the test environment is torn down.
const observers = [];
const RealObserver = window.MutationObserver;
window.MutationObserver = class extends RealObserver {
  constructor(callback) {
    super(callback);
    observers.push(this);
  }
};
afterAll(() => observers.forEach(observer => observer.disconnect()));

describe('SDK DOM helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds the widget styles to the page, kept across Turbo visits', () => {
    loadCSS();

    const style = document.getElementById('cw-widget-styles');
    expect(style.tagName).toBe('STYLE');
    expect(style.dataset.turboPermanent).toBe('true');
  });

  it('moves the widget into a new Turbo body unless it is already there', () => {
    ['cw-bubble-holder', 'cw-widget-holder', 'cw-widget-styles'].forEach(id => {
      const element = document.createElement('div');
      element.id = id;
      document.body.appendChild(element);
    });
    const newBody = document.createElement('body');
    const existingHolder = document.createElement('div');
    existingHolder.id = 'cw-widget-holder';
    newBody.appendChild(existingHolder);

    restoreWidgetInDOM(newBody);

    expect(newBody.querySelector('#cw-bubble-holder')).not.toBeNull();
    expect(newBody.querySelector('#cw-widget-styles')).not.toBeNull();
    expect(newBody.querySelectorAll('#cw-widget-holder')).toHaveLength(1);
    expect(newBody.querySelector('#cw-widget-holder')).toBe(existingHolder);
  });

  it('adds, toggles and removes space-separated classes', () => {
    const element = document.createElement('div');

    addClasses(element, 'one two');
    toggleClass(element, 'three');
    removeClasses(element, 'one three');

    expect([...element.classList]).toEqual(['two']);
  });

  it('reports the current page, then each change of URL', async () => {
    const onLocationChange = vi
      .spyOn(IFrameHelper.events, 'onLocationChange')
      .mockImplementation(() => {});

    onLocationChangeListener();
    expect(onLocationChange).toHaveBeenCalledWith({
      referrerURL: 'http://localhost:3000/',
      referrerHost: 'localhost:3000',
    });

    window.history.pushState({}, '', '/pricing');
    document.body.appendChild(document.createElement('div'));
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
    document.body.appendChild(document.createElement('div'));
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });

    expect(onLocationChange).toHaveBeenLastCalledWith({
      referrerURL: 'http://localhost:3000/pricing',
      referrerHost: 'localhost:3000',
    });
    expect(onLocationChange).toHaveBeenCalledTimes(2);
    window.history.pushState({}, '', '/');
  });
});
