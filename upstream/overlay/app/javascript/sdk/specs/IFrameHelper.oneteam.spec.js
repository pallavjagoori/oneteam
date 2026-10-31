/**
 * OneTeam specs for the website SDK's iframe bridge: creating the widget
 * iframe, the postMessage protocol between the site and the widget, and the
 * events the widget sends back (loaded, errors, unread messages, resizing).
 */
import Cookies from 'js-cookie';
import { IFrameHelper } from '../IFrameHelper';
import { bubbleHolder, widgetHolder } from '../bubbleHelpers';
import * as audioHelper from 'shared/helpers/AudioNotificationHelper';
import * as popoutHelper from 'widget/helpers/popoutHelper';

vi.mock('shared/helpers/AudioNotificationHelper', () => ({
  initOnEvents: ['click'],
  getAlertAudio: vi.fn(() => Promise.resolve()),
}));
vi.mock('widget/helpers/popoutHelper', () => ({ popoutChatWindow: vi.fn() }));

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

const sentMessages = () =>
  IFrameHelper.getAppFrame().contentWindow.postMessage.mock.calls.map(
    ([payload]) => JSON.parse(payload.replace('chatwoot-widget:', ''))
  );

const windowEvents = names => {
  const seen = [];
  names.forEach(name =>
    window.addEventListener(name, event => seen.push([name, event.detail]))
  );
  return seen;
};

describe('SDK iframe bridge', () => {
  beforeAll(() => {
    window.matchMedia = vi.fn(() => ({ matches: false }));
    window.$chatwoot = {
      baseUrl: 'https://chat.example.com',
      websiteToken: 'token-1',
      position: 'left',
      hideMessageBubble: true,
      widgetStyle: 'flat',
      locale: 'en',
      type: 'standard',
      isOpen: false,
      toggle: vi.fn(),
    };
    Cookies.set('cw_conversation', 'saved-token');

    IFrameHelper.createFrame({
      baseUrl: 'https://chat.example.com',
      websiteToken: 'token-1',
    });
    vi.spyOn(IFrameHelper.getAppFrame().contentWindow, 'postMessage');
  });

  beforeEach(() => {
    IFrameHelper.getAppFrame().contentWindow.postMessage.mockClear();
  });

  it('creates one hidden iframe that resumes the saved conversation', () => {
    const iframe = IFrameHelper.getAppFrame();

    expect(iframe.src).toBe(
      'https://chat.example.com/widget?website_token=token-1&cw_conversation=saved-token'
    );
    expect(iframe.style.visibility).toBe('hidden');
    expect(widgetHolder.className).toContain('woot-elements--left');
    expect(widgetHolder.className).toContain('woot-widget--without-bubble');
    expect(widgetHolder.className).toContain('woot-widget-holder--flat');

    IFrameHelper.createFrame({
      baseUrl: 'https://other.example.com',
      websiteToken: 'x',
    });
    expect(
      document.querySelectorAll('#chatwoot_live_chat_widget')
    ).toHaveLength(1);
  });

  it('dispatches widget messages to their handlers and ignores others', () => {
    const postback = vi.spyOn(IFrameHelper.events, 'postback');

    window.onmessage({ data: { not: 'a string' } });
    window.onmessage({ data: 'other-app:{}' });
    window.onmessage({ data: 'chatwoot-widget:{"event":"unknown"}' });
    window.onmessage({ data: 'chatwoot-widget:{"event":"postback","id":7}' });

    expect(postback).toHaveBeenCalledTimes(1);
    expect(postback).toHaveBeenCalledWith({ event: 'postback', id: 7 });
  });

  it('tells the widget whether to show a close button on resize', () => {
    window.matchMedia.mockReturnValueOnce({ matches: true });

    window.dispatchEvent(new Event('resize'));

    expect(sentMessages()).toEqual([
      { event: 'toggle-close-button', isMobile: true },
    ]);
  });

  it('stops the page from scrolling past the ends of the widget', () => {
    const wheel = deltaY => {
      const event = new WheelEvent('wheel', { deltaY, cancelable: true });
      widgetHolder.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(wheel(-10)).toBe(true);
    expect(wheel(10)).toBe(true);
    Object.defineProperty(widgetHolder, 'scrollHeight', {
      value: 500,
      configurable: true,
    });
    expect(wheel(10)).toBe(false);
  });

  it('sizes the iframe to its content or to a fixed height', () => {
    IFrameHelper.events.updateIframeHeight({
      extraHeight: 120,
      isFixedHeight: true,
    });
    expect(IFrameHelper.getAppFrame().getAttribute('style')).toBe(
      'height: 120px !important'
    );

    IFrameHelper.events.updateIframeHeight({ isFixedHeight: false });
    expect(IFrameHelper.getAppFrame().getAttribute('style')).toBe(
      'height: 100% !important'
    );
  });

  it('configures the widget, shows the bubble and announces readiness when loaded', () => {
    window.$chatwoot.user = { email: 'jane@example.com' };
    const seen = windowEvents(['chatwoot:ready']);

    IFrameHelper.events.loaded({
      config: {
        authToken: 'auth-1',
        channelConfig: { widgetColor: '#FFFFFF' },
      },
    });

    expect(window.$chatwoot.hasLoaded).toBe(true);
    expect(Cookies.get('cw_conversation')).toBe('auth-1');
    const events = sentMessages().map(message => message.event);
    expect(events).toEqual([
      'config-set',
      'change-url',
      'toggle-close-button',
      'set-user',
    ]);
    expect(sentMessages()[0]).toMatchObject({
      locale: 'en',
      position: 'left',
      widgetStyle: 'flat',
    });
    expect(
      bubbleHolder.querySelector('.woot-widget-bubble--flat')
    ).not.toBeNull();
    expect(
      bubbleHolder.querySelector('.woot-widget-bubble-color--lighter')
    ).not.toBeNull();
    expect(seen).toEqual([['chatwoot:ready', null]]);
    expect(window.playAudioAlert()).toBeUndefined();
  });

  it('sets up the alert sound on the first interaction and then stops listening', async () => {
    document.dispatchEvent(new Event('click'));
    await Promise.resolve();
    await Promise.resolve();
    document.dispatchEvent(new Event('click'));

    expect(audioHelper.getAlertAudio).toHaveBeenCalledTimes(1);
    expect(audioHelper.getAlertAudio).toHaveBeenCalledWith(
      'https://chat.example.com',
      {
        type: 'widget',
        alertTone: 'ding',
      }
    );
  });

  it('does not announce readiness again after a reset, or show a second bubble', () => {
    window.$chatwoot.resetTriggered = true;
    delete window.$chatwoot.user;
    const seen = windowEvents(['chatwoot:ready']);

    IFrameHelper.events.loaded({
      config: {
        authToken: 'auth-2',
        channelConfig: { widgetColor: '#000000' },
      },
    });

    expect(seen).toEqual([]);
    expect(document.querySelectorAll('.woot--bubble-holder')).toHaveLength(1);
    expect(sentMessages().map(message => message.event)).not.toContain(
      'set-user'
    );
  });

  it('forwards widget errors and forgets the user when setting the user failed', () => {
    const seen = windowEvents(['chatwoot:error']);
    Cookies.set('cw_user_token-1', 'stale');

    IFrameHelper.events.error({ errorType: 'OTHER', data: { message: 'x' } });
    expect(Cookies.get('cw_user_token-1')).toBe('stale');
    IFrameHelper.events.error({
      errorType: 'SET_USER_ERROR',
      data: { message: 'y' },
    });

    expect(Cookies.get('cw_user_token-1')).toBeUndefined();
    expect(seen).toEqual([
      ['chatwoot:error', { message: 'x' }],
      ['chatwoot:error', { message: 'y' }],
    ]);
  });

  it('re-dispatches custom widget events on the window', () => {
    const seen = windowEvents(['chatwoot:custom']);

    IFrameHelper.events.onEvent({
      eventIdentifier: 'chatwoot:custom',
      data: { a: 1 },
    });
    IFrameHelper.events.postback({ id: 3 });

    expect(seen).toEqual([['chatwoot:custom', { a: 1 }]]);
  });

  it('saves the auth token and snoozes campaigns for an hour', () => {
    IFrameHelper.events.setAuthCookie({ data: { widgetAuthToken: 'auth-3' } });
    IFrameHelper.events.setCampaignReadOn();

    expect(Cookies.get('cw_conversation')).toBe('auth-3');
    expect(Number(Cookies.get('cw_snooze_campaigns_till'))).toBeGreaterThan(
      Date.now()
    );
  });

  it('uses the launcher title from the site over the widget label', () => {
    const bubbleText = vi.fn();
    window.$chatwoot.type = 'standard';

    expect(() =>
      IFrameHelper.events.setBubbleLabel({ label: 'Hi' })
    ).not.toThrow();
    expect(bubbleText).not.toHaveBeenCalled();
  });

  it('opens, closes and toggles the widget on request', () => {
    window.$chatwoot.isOpen = false;

    IFrameHelper.events.toggleBubble('open');
    expect(window.$chatwoot.isOpen).toBe(true);
    expect(sentMessages()).toEqual([
      { event: 'toggle-open', isOpen: true },
      { event: 'push-event', eventName: 'webwidget.triggered' },
    ]);

    IFrameHelper.events.toggleBubble('close');
    expect(window.$chatwoot.isOpen).toBe(false);
    IFrameHelper.events.toggleBubble();
    expect(window.$chatwoot.isOpen).toBe(true);
    IFrameHelper.events.closeChat();
    expect(window.$chatwoot.isOpen).toBe(false);
  });

  it('opens the widget in unread mode and closes it again', () => {
    IFrameHelper.events.setUnreadMode();
    expect(widgetHolder.classList).toContain('has-unread-view');
    expect(window.$chatwoot.isOpen).toBe(true);

    IFrameHelper.events.resetUnreadMode();
    expect(widgetHolder.classList).not.toContain('has-unread-view');

    IFrameHelper.events.setUnreadMode();
    IFrameHelper.events.closeWindow();
    expect(widgetHolder.classList).not.toContain('has-unread-view');
    expect(window.$chatwoot.isOpen).toBe(false);
  });

  it('pops the chat out into its own window', () => {
    IFrameHelper.events.popoutChatWindow({
      baseUrl: 'https://chat.example.com',
      websiteToken: 'token-1',
      locale: 'fr',
    });

    expect(window.$chatwoot.toggle).toHaveBeenCalledWith('close');
    expect(popoutHelper.popoutChatWindow).toHaveBeenCalledWith(
      'https://chat.example.com',
      'token-1',
      'fr',
      'auth-3'
    );
  });

  it('tells the widget about page changes', () => {
    IFrameHelper.events.onLocationChange({
      referrerURL: 'https://a.test/x',
      referrerHost: 'a.test',
    });

    expect(sentMessages()).toEqual([
      {
        event: 'change-url',
        referrerURL: 'https://a.test/x',
        referrerHost: 'a.test',
      },
    ]);
  });

  it('shows and clears the unread dot on the bubble', () => {
    const bubble = document.querySelector('.woot-widget-bubble');
    window.$chatwoot.hideMessageBubble = true;
    IFrameHelper.events.handleNotificationDot({ unreadMessageCount: 2 });
    expect(bubble.classList).not.toContain('unread-notification');

    window.$chatwoot.hideMessageBubble = false;
    IFrameHelper.events.handleNotificationDot({ unreadMessageCount: 2 });
    IFrameHelper.events.handleNotificationDot({ unreadMessageCount: 3 });
    expect(bubble.classList).toContain('unread-notification');
    IFrameHelper.events.handleNotificationDot({ unreadMessageCount: 0 });
    expect(bubble.classList).not.toContain('unread-notification');
  });

  it('plays the alert sound the widget asks for', () => {
    window.playAudioAlert = vi.fn();

    IFrameHelper.events.playAudio();

    expect(window.playAudioAlert).toHaveBeenCalled();
  });
});
