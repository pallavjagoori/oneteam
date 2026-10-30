import {
  setupFacebookSdk,
  initWhatsAppEmbeddedSignup,
  createMessageHandler,
} from 'dashboard/routes/dashboard/settings/inbox/channels/whatsapp/utils';
import { useFacebookPageConnect } from '../useFacebookPageConnect';
import { useWhatsappEmbeddedSignup } from '../useWhatsappEmbeddedSignup';

/*
 * OneTeam coverage for edge cases of the two Meta sign-in flows: a
 * "connected" Facebook login that carries no token, and WhatsApp embedded
 * signup events that arrive twice, after the flow ended, or without an
 * error message.
 */
vi.mock(
  'dashboard/routes/dashboard/settings/inbox/channels/whatsapp/utils',
  async importOriginal => ({
    ...(await importOriginal()),
    setupFacebookSdk: vi.fn(() => Promise.resolve()),
    initWhatsAppEmbeddedSignup: vi.fn(),
    createMessageHandler: vi.fn(),
  })
);
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ({ value: 1 }),
}));
vi.mock('dashboard/api/channels', () => ({
  default: { fetchFacebookPages: vi.fn() },
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const tick = () =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
  });
const business = { business_id: 'b', waba_id: 'w', phone_number_id: 'p' };

describe('Meta sign-in edge cases (OneTeam)', () => {
  let emit;

  beforeEach(() => {
    vi.clearAllMocks();
    window.chatwootConfig = {};
    createMessageHandler.mockImplementation(callback => {
      emit = callback;
      return () => {};
    });
  });

  it('treats a connected Facebook login without a token as cancelled', async () => {
    window.FB = { login: callback => callback({ status: 'connected' }) };
    await expect(
      useFacebookPageConnect().loginAndFetchPages()
    ).resolves.toBeNull();
    expect(setupFacebookSdk).toHaveBeenCalled();
  });

  it('keeps the first business data and ignores events after the flow ends', async () => {
    let giveCode;
    initWhatsAppEmbeddedSignup.mockReturnValue(
      new Promise(resolve => {
        giveCode = resolve;
      })
    );
    const result = useWhatsappEmbeddedSignup().runEmbeddedSignup();
    await tick();
    emit({
      event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
      data: { waba_id: 'first' },
    });
    emit({ event: 'FINISH', data: business });
    giveCode('code');
    await expect(result).resolves.toEqual({
      code: 'code',
      business_id: '',
      waba_id: 'first',
      phone_number_id: '',
      is_coexistence: true,
    });
    emit({ event: 'CANCEL' });
  });

  it('uses the generic message for an error event without one', async () => {
    initWhatsAppEmbeddedSignup.mockReturnValue(new Promise(() => {}));
    const result = useWhatsappEmbeddedSignup().runEmbeddedSignup();
    emit({ event: 'ERROR' });
    await expect(result).rejects.toThrow(
      'INBOX_MGMT.ADD.WHATSAPP.EMBEDDED_SIGNUP.SIGNUP_ERROR'
    );
  });
});
