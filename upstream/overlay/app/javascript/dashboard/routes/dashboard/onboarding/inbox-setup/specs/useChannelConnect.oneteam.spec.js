/**
 * OneTeam spec for useChannelConnect, which connects a channel from the
 * onboarding inbox setup: OAuth redirects for Google, Microsoft, Instagram
 * and TikTok, and Meta's embedded signup popup for WhatsApp.
 */
import { ref } from 'vue';
import { useAlert } from 'dashboard/composables';
import googleClient from 'dashboard/api/channel/googleClient';
import instagramClient from 'dashboard/api/channel/instagramClient';
import { useChannelConnect } from '../useChannelConnect';

const dispatch = vi.fn();
const metaDisabled = ref(false);
const runEmbeddedSignup = vi.fn();

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ isMetaInboxCreationDisabled: metaDisabled }),
}));
vi.mock('dashboard/composables/useWhatsappEmbeddedSignup', () => ({
  useWhatsappEmbeddedSignup: () => ({ runEmbeddedSignup }),
}));
vi.mock('dashboard/api/channel/googleClient', () => ({
  default: { generateAuthorization: vi.fn() },
}));
vi.mock('dashboard/api/channel/microsoftClient', () => ({
  default: { generateAuthorization: vi.fn() },
}));
vi.mock('dashboard/api/channel/instagramClient', () => ({
  default: { generateAuthorization: vi.fn() },
}));
vi.mock('dashboard/api/channel/tiktokClient', () => ({
  default: { generateAuthorization: vi.fn() },
}));

const ERROR = 'ONBOARDING_INBOX_SETUP.ERROR';
const META_RESTRICTED = 'ONBOARDING_INBOX_SETUP.META_RESTRICTION.MESSAGE';

let originalLocation;
beforeAll(() => {
  originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: 'http://localhost/onboarding' },
  });
});
afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});
beforeEach(() => {
  metaDisabled.value = false;
});

describe('connectViaOAuth', () => {
  it('redirects to the provider with a return-to-onboarding hint', async () => {
    googleClient.generateAuthorization.mockResolvedValue({
      data: { url: 'https://accounts.google.test/auth' },
    });
    await useChannelConnect().connectViaOAuth('google');
    expect(googleClient.generateAuthorization).toHaveBeenCalledWith({
      return_to: 'onboarding',
    });
    expect(window.location.href).toBe('https://accounts.google.test/auth');
  });

  it('ignores a provider without an OAuth client', async () => {
    await useChannelConnect().connectViaOAuth('sms');
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('blocks Instagram when Meta inbox creation is disabled', async () => {
    metaDisabled.value = true;
    await useChannelConnect().connectViaOAuth('instagram');
    expect(useAlert).toHaveBeenCalledWith(META_RESTRICTED);
    expect(instagramClient.generateAuthorization).not.toHaveBeenCalled();
  });

  it('alerts when the authorization request fails', async () => {
    googleClient.generateAuthorization.mockRejectedValue(new Error('500'));
    await useChannelConnect().connectViaOAuth('google');
    expect(useAlert).toHaveBeenCalledWith(ERROR);
  });
});

describe('connectWhatsapp', () => {
  const credentials = { code: 'c', business_id: 'b', waba_id: 'w' };

  it('is blocked when Meta inbox creation is disabled', async () => {
    metaDisabled.value = true;
    await useChannelConnect().connectWhatsapp();
    expect(useAlert).toHaveBeenCalledWith(META_RESTRICTED);
    expect(runEmbeddedSignup).not.toHaveBeenCalled();
  });

  it('alerts when the signup popup fails', async () => {
    runEmbeddedSignup.mockRejectedValue(new Error('popup blocked'));
    await useChannelConnect().connectWhatsapp();
    expect(useAlert).toHaveBeenCalledWith(ERROR);
  });

  it('does nothing when the popup is dismissed', async () => {
    runEmbeddedSignup.mockResolvedValue(null);
    await useChannelConnect().connectWhatsapp();
    expect(dispatch).not.toHaveBeenCalled();
    expect(useAlert).not.toHaveBeenCalled();
  });

  it('creates the inbox, refetches inboxes and confirms', async () => {
    runEmbeddedSignup.mockResolvedValue(credentials);
    await useChannelConnect().connectWhatsapp();
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      'inboxes/createWhatsAppEmbeddedSignup',
      credentials
    );
    expect(dispatch).toHaveBeenNthCalledWith(2, 'inboxes/get');
    expect(useAlert).toHaveBeenCalledWith(
      'ONBOARDING_INBOX_SETUP.WHATSAPP_CONNECTED'
    );
  });

  it('shows the API error, or a generic one, when creation fails', async () => {
    runEmbeddedSignup.mockResolvedValue(credentials);
    dispatch.mockRejectedValueOnce({
      response: { data: { message: 'Number already connected' } },
    });
    await useChannelConnect().connectWhatsapp();
    expect(useAlert).toHaveBeenLastCalledWith('Number already connected');
    dispatch.mockRejectedValueOnce(undefined);
    await useChannelConnect().connectWhatsapp();
    expect(useAlert).toHaveBeenLastCalledWith(ERROR);
  });

  it('passes a non-API error object to the alert as it is (FINDINGS.md)', async () => {
    runEmbeddedSignup.mockResolvedValue(credentials);
    const error = new Error('network');
    dispatch.mockRejectedValueOnce(error);
    await useChannelConnect().connectWhatsapp();
    expect(useAlert).toHaveBeenLastCalledWith(error);
  });
});
