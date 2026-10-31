/**
 * OneTeam spec for the WhatsApp embedded signup helpers: loading and
 * starting the Facebook SDK, the FB.login popup, and reading Meta's
 * postMessage events.
 */
import { loadScript } from 'dashboard/helper/DOMHelpers';
import {
  loadFacebookSdk,
  initializeFacebook,
  isValidBusinessData,
  classifySignupEvent,
  createMessageHandler,
  initWhatsAppEmbeddedSignup,
  setupFacebookSdk,
  SIGNUP_RESULT,
} from '../utils';

vi.mock('dashboard/helper/DOMHelpers', () => ({
  loadScript: vi.fn(() => Promise.resolve()),
}));

afterEach(() => {
  delete window.FB;
  delete window.fbAsyncInit;
});

describe('Facebook SDK', () => {
  it('loads the SDK script asynchronously', async () => {
    await loadFacebookSdk();
    expect(loadScript).toHaveBeenCalledWith(
      'https://connect.facebook.net/en_US/sdk.js',
      { async: true, defer: true, crossOrigin: 'anonymous' }
    );
  });

  it('initializes a loaded SDK right away with the given version', async () => {
    window.FB = { init: vi.fn() };
    await initializeFacebook('app-1', 'v19.0');
    expect(window.FB.init).toHaveBeenCalledWith({
      appId: 'app-1',
      autoLogAppEvents: true,
      xfbml: true,
      version: 'v19.0',
    });
  });

  it('waits for the SDK to call fbAsyncInit, defaulting to v22.0', async () => {
    const ready = initializeFacebook('app-2');
    window.FB = { init: vi.fn() };
    window.fbAsyncInit();
    await ready;
    expect(window.FB.init).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'app-2', version: 'v22.0' })
    );
  });

  it('loads then initializes in setupFacebookSdk', async () => {
    window.FB = { init: vi.fn() };
    await setupFacebookSdk('app-3');
    expect(loadScript).toHaveBeenCalled();
    expect(window.FB.init).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'app-3', version: 'v22.0' })
    );
    await setupFacebookSdk('app-3', 'v20.0');
    expect(window.FB.init).toHaveBeenLastCalledWith(
      expect.objectContaining({ version: 'v20.0' })
    );
  });
});

describe('isValidBusinessData', () => {
  it('needs a waba_id', () => {
    expect(isValidBusinessData({ waba_id: '1' })).toBe(true);
    expect(isValidBusinessData({ business_id: '1' })).toBe(false);
    expect(isValidBusinessData(null)).toBe(false);
  });
});

describe('classifySignupEvent', () => {
  it.each([
    [undefined, { type: SIGNUP_RESULT.IGNORE }],
    [{ event: 42 }, { type: SIGNUP_RESULT.IGNORE }],
    [{ event: 'FINISH' }, { type: SIGNUP_RESULT.FINISH, isCoexistence: false }],
    [
      { event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' },
      { type: SIGNUP_RESULT.FINISH, isCoexistence: true },
    ],
    [{ event: 'FINISH_ONLY_WABA' }, { type: SIGNUP_RESULT.UNSUPPORTED }],
    [{ event: 'FINISH_OBO_MIGRATION' }, { type: SIGNUP_RESULT.UNSUPPORTED }],
    [
      { event: 'FINISH_GRANT_ONLY_API_ACCESS' },
      { type: SIGNUP_RESULT.UNSUPPORTED },
    ],
    [
      { event: 'error', error_message: 'v3 failure' },
      { type: SIGNUP_RESULT.ERROR, errorMessage: 'v3 failure' },
    ],
    [
      { event: 'ERROR', error_message: 'v4 failure' },
      { type: SIGNUP_RESULT.ERROR, errorMessage: 'v4 failure' },
    ],
    [
      { event: 'CANCEL', error_message: 'Number in use' },
      { type: SIGNUP_RESULT.ERROR, errorMessage: 'Number in use' },
    ],
    [{ event: 'CANCEL' }, { type: SIGNUP_RESULT.CANCEL }],
    [{ event: 'PROGRESS' }, { type: SIGNUP_RESULT.IGNORE }],
  ])('classifies %j', (data, expected) => {
    expect(classifySignupEvent(data)).toEqual(expected);
  });
});

describe('createMessageHandler', () => {
  const signup = { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH' };
  let onData;
  let handle;
  beforeEach(() => {
    onData = vi.fn();
    handle = createMessageHandler(onData);
  });

  it('passes signup data from facebook.com, as a string or an object', () => {
    handle({
      origin: 'https://www.facebook.com',
      data: JSON.stringify(signup),
    });
    handle({ origin: 'https://web.facebook.com', data: signup });
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenCalledWith(signup);
  });

  it('ignores other origins, other message types and bad payloads', () => {
    handle({ origin: 'https://evil.test', data: signup });
    handle({ origin: 'https://facebook.com', data: { type: 'OTHER' } });
    handle({ origin: 'https://facebook.com', data: null });
    handle({ origin: 'https://facebook.com', data: 7 });
    handle({ origin: 'https://facebook.com', data: '{not json' });
    expect(onData).not.toHaveBeenCalled();
  });
});

describe('initWhatsAppEmbeddedSignup', () => {
  const login = response => {
    window.FB = {
      login: vi.fn(callback => callback(response)),
    };
    return initWhatsAppEmbeddedSignup('config-9');
  };

  it('opens the popup for the configuration and resolves with the code', async () => {
    await expect(login({ authResponse: { code: 'abc' } })).resolves.toBe('abc');
    expect(window.FB.login).toHaveBeenCalledWith(expect.any(Function), {
      config_id: 'config-9',
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: '3',
      },
    });
  });

  it('rejects with the SDK error or as cancelled', async () => {
    await expect(login({ error: 'denied' })).rejects.toThrow('denied');
    await expect(login({ authResponse: {} })).rejects.toThrow(
      'Login cancelled'
    );
    await expect(login({})).rejects.toThrow('Login cancelled');
  });
});
