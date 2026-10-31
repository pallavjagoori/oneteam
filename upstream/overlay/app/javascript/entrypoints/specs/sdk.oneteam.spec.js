/**
 * OneTeam spec for the public website SDK (window.chatwootSDK and the
 * window.$chatwoot API that site owners call). These calls are a public
 * contract: the port must keep every method, message name and error.
 */
import Cookies from 'js-cookie';
import { IFrameHelper } from '../../sdk/IFrameHelper';
import { restoreWidgetInDOM } from '../../sdk/DOMHelpers';
import { setCookieWithDomain } from '../../sdk/cookieHelpers';
import { SDK_SET_BUBBLE_VISIBILITY } from 'shared/constants/sharedFrameEvents';
import '../sdk';

vi.mock('../../sdk/IFrameHelper', () => ({
  IFrameHelper: {
    createFrame: vi.fn(),
    sendMessage: vi.fn(),
    getAppFrame: vi.fn(),
    getUrl: vi.fn(() => 'https://app.test/widget?website_token=t'),
    events: { toggleBubble: vi.fn(), popoutChatWindow: vi.fn() },
  },
}));

vi.mock('../../sdk/DOMHelpers', async importOriginal => ({
  ...(await importOriginal()),
  restoreWidgetInDOM: vi.fn(),
}));

vi.mock('../../sdk/cookieHelpers', async importOriginal => ({
  ...(await importOriginal()),
  setCookieWithDomain: vi.fn(),
}));

const run = (settings = {}) => {
  delete window.$chatwoot;
  window.chatwootSettings = settings;
  window.chatwootSDK.run({ baseUrl: 'https://app.test', websiteToken: 't' });
  return window.$chatwoot;
};

afterEach(() => {
  delete window.$chatwoot;
  delete window.chatwootSettings;
  delete window.Turbolinks;
});

describe('chatwootSDK.run', () => {
  it('builds $chatwoot with defaults and creates the widget frame', () => {
    delete window.chatwootSettings;
    window.chatwootSDK.run({ baseUrl: 'https://app.test', websiteToken: 't' });
    expect(window.$chatwoot).toMatchObject({
      baseUrl: 'https://app.test',
      websiteToken: 't',
      hasLoaded: false,
      hideMessageBubble: false,
      isOpen: false,
      position: 'right',
      useBrowserLanguage: false,
      type: 'standard',
      launcherTitle: '',
      showPopoutButton: false,
      showUnreadMessagesDialog: true,
      widgetStyle: 'standard',
      resetTriggered: false,
      darkMode: 'light',
      welcomeTitle: '',
      welcomeDescription: '',
      availableMessage: '',
      unavailableMessage: '',
      enableEmojiPicker: true,
      enableEndConversation: true,
    });
    expect(IFrameHelper.createFrame).toHaveBeenCalledWith({
      baseUrl: 'https://app.test',
      websiteToken: 't',
    });
  });

  it('applies the site settings', () => {
    const sdk = run({
      locale: 'fr',
      baseDomain: 'example.test',
      hideMessageBubble: true,
      position: 'left',
      type: 'expanded_bubble',
      launcherTitle: 'Chat',
      showPopoutButton: true,
      showUnreadMessagesDialog: false,
      widgetStyle: 'flat',
      darkMode: 'auto',
      welcomeTitle: 'Hi',
      welcomeDescription: 'Ask us',
      availableMessage: 'Online',
      unavailableMessage: 'Away',
      enableFileUpload: false,
      enableEmojiPicker: false,
      enableEndConversation: false,
    });
    expect(sdk).toMatchObject({
      locale: 'fr',
      baseDomain: 'example.test',
      hideMessageBubble: true,
      position: 'left',
      type: 'expanded_bubble',
      launcherTitle: 'Chat',
      showPopoutButton: true,
      showUnreadMessagesDialog: false,
      widgetStyle: 'flat',
      darkMode: 'auto',
      enableFileUpload: false,
      enableEmojiPicker: false,
      enableEndConversation: false,
    });
  });

  it('uses the browser language when asked', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('pt-BR');
    expect(run({ useBrowserLanguage: true, locale: 'en' }).locale).toBe(
      'pt_BR'
    );
  });

  it('does nothing when the SDK already ran', () => {
    window.$chatwoot = { existing: true };
    window.chatwootSDK.run({
      baseUrl: 'https://other.test',
      websiteToken: 'x',
    });
    expect(window.$chatwoot).toEqual({ existing: true });
    expect(IFrameHelper.createFrame).not.toHaveBeenCalled();
  });

  it('keeps the widget across Turbo, Turbolinks and Astro page swaps', () => {
    window.Turbolinks = {};
    run();
    const newBody = document.createElement('body');
    document.dispatchEvent(
      Object.assign(new Event('turbo:before-render'), {
        detail: { renderMethod: 'morph', newBody },
      })
    );
    expect(restoreWidgetInDOM).not.toHaveBeenCalled();
    document.dispatchEvent(
      Object.assign(new Event('turbo:before-render'), {
        detail: { renderMethod: 'replace', newBody },
      })
    );
    document.dispatchEvent(
      Object.assign(new Event('turbolinks:before-render'), {
        data: { newBody },
      })
    );
    document.dispatchEvent(
      Object.assign(new Event('astro:before-swap'), {
        newDocument: { body: newBody },
      })
    );
    // Listeners from earlier runs in this file fire too, so count at least.
    expect(restoreWidgetInDOM.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(restoreWidgetInDOM).toHaveBeenCalledWith(newBody);
  });
});

describe('$chatwoot methods', () => {
  let sdk;
  beforeEach(() => {
    sdk = run({ locale: 'de' });
  });

  it('toggles the chat window', () => {
    sdk.toggle('open');
    expect(IFrameHelper.events.toggleBubble).toHaveBeenCalledWith('open');
  });

  it('hides and shows the bubble and tells the widget', () => {
    document.body.innerHTML =
      '<div class="woot--bubble-holder"></div><div class="woot-widget-holder"></div>';
    const bubble = document.querySelector('.woot--bubble-holder');
    const holder = document.querySelector('.woot-widget-holder');
    sdk.toggleBubbleVisibility('hide');
    expect(bubble.classList.contains('woot-hidden')).toBe(true);
    expect(holder.classList.contains('woot-widget--without-bubble')).toBe(true);
    expect(IFrameHelper.sendMessage).toHaveBeenLastCalledWith(
      SDK_SET_BUBBLE_VISIBILITY,
      { hideMessageBubble: true }
    );
    sdk.toggleBubbleVisibility('show');
    expect(bubble.classList.contains('woot-hidden')).toBe(false);
    expect(sdk.hideMessageBubble).toBe(false);
    sdk.toggleBubbleVisibility('other');
    expect(IFrameHelper.sendMessage).toHaveBeenLastCalledWith(
      SDK_SET_BUBBLE_VISIBILITY,
      { hideMessageBubble: false }
    );
  });

  it('pops the chat out with the site locale', () => {
    sdk.popoutChatWindow();
    expect(IFrameHelper.events.popoutChatWindow).toHaveBeenCalledWith({
      baseUrl: 'https://app.test',
      websiteToken: 't',
      locale: 'de',
    });
  });

  describe('setUser', () => {
    it('rejects a bad identifier or a user without known keys', () => {
      expect(() => sdk.setUser({}, { name: 'A' })).toThrow(
        'Identifier should be a string or a number'
      );
      expect(() => sdk.setUser(1, { phone: '1' })).toThrow(
        'User object should have one of the keys [avatar_url, email, name]'
      );
    });

    it('sends the user and stores its hash in a cookie', () => {
      vi.spyOn(Cookies, 'get').mockReturnValue(undefined);
      sdk.setUser(42, { email: 'ada@example.test' });
      expect(sdk.identifier).toBe(42);
      expect(IFrameHelper.sendMessage).toHaveBeenCalledWith('set-user', {
        identifier: 42,
        user: { email: 'ada@example.test' },
      });
      expect(setCookieWithDomain).toHaveBeenCalledWith(
        'cw_user_t',
        expect.any(String),
        { baseDomain: undefined }
      );
    });

    it('skips a user whose hash matches the cookie', () => {
      sdk.setUser('ada', { name: 'Ada' });
      const [, hash] = setCookieWithDomain.mock.calls[0];
      IFrameHelper.sendMessage.mockClear();
      vi.spyOn(Cookies, 'get').mockReturnValue(hash);
      sdk.setUser('ada', { name: 'Ada' });
      expect(IFrameHelper.sendMessage).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['setCustomAttributes', 'set-custom-attributes'],
    ['setConversationCustomAttributes', 'set-conversation-custom-attributes'],
  ])('%s needs at least one key', (method, message) => {
    expect(() => sdk[method]()).toThrow(
      'Custom attributes should have atleast one key'
    );
    expect(() => sdk[method](null)).toThrow();
    sdk[method]({ plan: 'pro' });
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith(message, {
      customAttributes: { plan: 'pro' },
    });
  });

  it.each([
    ['deleteCustomAttribute', 'delete-custom-attribute'],
    [
      'deleteConversationCustomAttribute',
      'delete-conversation-custom-attribute',
    ],
  ])('%s needs an attribute name', (method, message) => {
    expect(() => sdk[method]()).toThrow('Custom attribute is required');
    sdk[method]('plan');
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith(message, {
      customAttribute: 'plan',
    });
  });

  it('sets and removes labels, locale and color scheme', () => {
    sdk.setLabel('vip');
    sdk.setLabel();
    sdk.removeLabel('vip');
    sdk.removeLabel();
    sdk.setLocale('es');
    sdk.setLocale();
    sdk.setColorScheme('dark');
    sdk.setColorScheme();
    const calls = IFrameHelper.sendMessage.mock.calls;
    expect(calls).toEqual([
      ['set-label', { label: 'vip' }],
      ['set-label', { label: '' }],
      ['remove-label', { label: 'vip' }],
      ['remove-label', { label: '' }],
      ['set-locale', { locale: 'es' }],
      ['set-locale', { locale: 'en' }],
      ['set-color-scheme', { darkMode: 'dark' }],
      ['set-color-scheme', { darkMode: 'light' }],
    ]);
  });

  it('resets the session, closing an open chat first', () => {
    const removeCookie = vi.spyOn(Cookies, 'remove');
    const iframe = { src: '' };
    IFrameHelper.getAppFrame.mockReturnValue(iframe);
    sdk.reset();
    expect(IFrameHelper.events.toggleBubble).not.toHaveBeenCalled();
    sdk.isOpen = true;
    sdk.reset();
    expect(IFrameHelper.events.toggleBubble).toHaveBeenCalledWith();
    expect(removeCookie).toHaveBeenCalledWith('cw_conversation');
    expect(removeCookie).toHaveBeenCalledWith('cw_user_t');
    expect(iframe.src).toBe('https://app.test/widget?website_token=t');
    expect(sdk.resetTriggered).toBe(true);
  });
});
