/**
 * OneTeam behaviour spec for the WhatsApp account health panel.
 *
 * Covers translated status, tier and mode labels, the colour of each
 * badge, the business profile card and its fallbacks, the coexistence
 * and onboarding rows, unparseable dates, the authorization and generic
 * error states with their message and configuration button, the empty
 * state, and the webhook card: registering a missing or mismatched
 * webhook and copying the configured and expected URLs, and opening
 * Meta Business Manager when there is no health data.
 */
import { mount, flushPromises } from '@vue/test-utils';
import AccountHealth from '../AccountHealth.vue';

const env = vi.hoisted(() => ({
  known: new Set(),
  copy: vi.fn(),
  alert: vi.fn(),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: key => key,
    te: key => env.known.has(key),
    locale: { value: 'en' },
  }),
}));
vi.mock('shared/helpers/clipboard', () => ({ copyTextToClipboard: env.copy }));
vi.mock('dashboard/composables', () => ({ useAlert: env.alert }));

const ButtonV4 = {
  name: 'ButtonV4',
  props: { icon: String, loading: Boolean, disabled: Boolean },
  emits: ['click'],
  template: '<button :class="icon" @click="$emit(\'click\')"><slot /></button>',
};

const mountHealth = props =>
  mount(AccountHealth, {
    props,
    global: {
      stubs: { ButtonV4, Avatar: true, Icon: true },
      directives: { tooltip: {} },
    },
  });

const buttonWith = (wrapper, text) =>
  wrapper
    .findAllComponents(ButtonV4)
    .find(button => button.text().includes(text));
const copyButtons = wrapper => wrapper.findAll('button.i-lucide-copy');
const badge = (wrapper, text) =>
  wrapper.findAll('span.rounded-md').find(span => span.text() === text);

describe('AccountHealth behaviour', () => {
  beforeEach(() => {
    env.known = new Set();
    vi.clearAllMocks();
  });

  it('translates known statuses, tiers and modes and colours badges', () => {
    env.known = new Set([
      'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.STATUSES.CONNECTED',
      'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.TIERS.TIER_1K',
      'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.MODES.LIVE',
    ]);
    const wrapper = mountHealth({
      healthData: {
        status: 'CONNECTED',
        quality_rating: 'GREEN',
        messaging_limit_tier: 'TIER_1K',
        account_mode: 'LIVE',
        code_verification_status: 'SOMETHING_NEW',
        name_status: 'APPROVED',
        is_on_biz_app: true,
        platform_type: 'CLOUD_API',
        last_onboarded_time: 'not a date',
      },
    });
    const text = wrapper.text();
    expect(text).toContain('INBOX_MGMT.ACCOUNT_HEALTH.VALUES.TIERS.TIER_1K');
    expect(text).toContain('not a date');
    expect(text).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.COEXISTENCE.LABEL'
    );
    expect(
      badge(
        wrapper,
        'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.STATUSES.CONNECTED'
      ).classes()
    ).toContain('text-n-teal-11');
    expect(badge(wrapper, 'GREEN').classes()).toContain('text-n-teal-11');
    expect(
      badge(wrapper, 'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.MODES.LIVE').classes()
    ).toContain('text-n-teal-11');
    expect(badge(wrapper, 'Something New').classes()).toContain(
      'text-n-slate-12'
    );
    expect(text).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.DISPLAY_NAME_STATUS.DESCRIPTIONS.APPROVED'
    );
  });

  it('falls back for unknown quality ratings, modes and missing values', () => {
    const wrapper = mountHealth({
      healthData: { quality_rating: 'PURPLE', account_mode: 'ODD' },
    });
    expect(badge(wrapper, 'PURPLE').classes()).toContain('text-n-slate-12');
    expect(badge(wrapper, 'Odd').classes()).toContain('text-n-slate-12');
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.DISPLAY_NAME_STATUS.DESCRIPTIONS.UNKNOWN'
    );
    expect(wrapper.text()).not.toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.FIELDS.COEXISTENCE.LABEL'
    );
  });

  it('shows the business profile with its fallbacks', () => {
    const full = mountHealth({
      healthData: {
        verified_name: 'Acme',
        display_phone_number: '+1 555',
        business_profile: {
          vertical: 'RETAIL',
          about: 'We sell things',
          description: 'Shop',
        },
      },
    });
    expect(full.text()).toContain('Acme');
    expect(full.text()).toContain('+1 555');
    expect(full.text()).toContain('Retail');
    expect(full.text()).toContain('We sell things');

    const sparse = mountHealth({
      healthData: { business_profile: { vertical: 'OTHER' } },
    });
    const text = sparse.text();
    expect(text).not.toContain('Other');
    expect(
      text.split('INBOX_MGMT.ACCOUNT_HEALTH.VALUES.NOT_AVAILABLE').length - 1
    ).toBeGreaterThan(4);
  });

  it('shows authorization and generic errors', async () => {
    const embedded = mountHealth({
      healthData: { status: 'CONNECTED' },
      healthError: { type: 'authorization', message: 'Token expired' },
      isEmbeddedSignup: true,
    });
    expect(embedded.text()).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.ERRORS.AUTHORIZATION.EMBEDDED_TITLE'
    );
    expect(embedded.text()).toContain('Token expired');
    await buttonWith(
      embedded,
      'INBOX_MGMT.ACCOUNT_HEALTH.ERRORS.GO_TO_CONFIGURATION'
    ).trigger('click');
    expect(embedded.emitted('goToConfiguration')).toHaveLength(1);

    const manual = mountHealth({ healthError: { type: 'authorization' } });
    expect(manual.text()).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.ERRORS.AUTHORIZATION.MANUAL_DESCRIPTION'
    );

    const generic = mountHealth({ healthError: { type: 'network' } });
    expect(generic.text()).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.ERRORS.GENERIC_TITLE'
    );
    expect(
      buttonWith(
        generic,
        'INBOX_MGMT.ACCOUNT_HEALTH.ERRORS.GO_TO_CONFIGURATION'
      )
    ).toBeUndefined();

    expect(mountHealth({}).text()).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.NO_DATA'
    );
  });

  it('asks to register a missing webhook', async () => {
    const wrapper = mountHealth({
      healthData: { webhook_configuration: {} },
      isRegisteringWebhook: true,
    });
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.WEBHOOK.ACTION_REQUIRED'
    );
    const register = buttonWith(
      wrapper,
      'INBOX_MGMT.ACCOUNT_HEALTH.WEBHOOK.REGISTER_BUTTON'
    );
    expect(register.props('loading')).toBe(true);
    await register.trigger('click');
    expect(wrapper.emitted('registerWebhook')).toHaveLength(1);
    expect(copyButtons(wrapper)).toHaveLength(0);
  });

  it('flags a mismatched webhook and copies both URLs', async () => {
    const wrapper = mountHealth({
      healthData: {
        webhook_configuration: {
          whatsapp_business_account: 'https://old.example/hook',
          application: 'https://app.example/hook',
        },
        expected_webhook_url: 'https://new.example/hook',
      },
    });
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.WEBHOOK.URL_MISMATCH'
    );
    const [configured, expected] = copyButtons(wrapper);
    await configured.trigger('click');
    await expected.trigger('click');
    await flushPromises();
    expect(env.copy.mock.calls).toEqual([
      ['https://old.example/hook'],
      ['https://new.example/hook'],
    ]);
    expect(env.alert).toHaveBeenCalledWith(
      'INBOX_MGMT.ACCOUNT_HEALTH.WEBHOOK.COPY_SUCCESS'
    );
  });

  it('confirms a correctly configured webhook', () => {
    const wrapper = mountHealth({
      healthData: {
        webhook_configuration: {
          phone_number: 'https://new.example/hook',
          application: 'https://app.example/hook',
        },
        expected_webhook_url: 'https://new.example/hook',
      },
    });
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.WEBHOOK.CONFIGURED_SUCCESS'
    );
    expect(copyButtons(wrapper)).toHaveLength(1);
    expect(
      buttonWith(wrapper, 'INBOX_MGMT.ACCOUNT_HEALTH.WEBHOOK.REGISTER_BUTTON')
    ).toBeUndefined();
  });

  it('opens Meta Business Manager and lists nothing without health data', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});
    const wrapper = mountHealth({});
    await buttonWith(
      wrapper,
      'INBOX_MGMT.ACCOUNT_HEALTH.GO_TO_SETTINGS'
    ).trigger('click');
    expect(open).toHaveBeenCalledWith(
      'https://business.facebook.com/',
      '_blank'
    );
    // Both lists sit behind a template v-if, so read them directly.
    expect(wrapper.vm.healthSections).toEqual([]);
    expect(wrapper.vm.businessProfileDetails).toEqual([]);
    open.mockRestore();
  });
});
