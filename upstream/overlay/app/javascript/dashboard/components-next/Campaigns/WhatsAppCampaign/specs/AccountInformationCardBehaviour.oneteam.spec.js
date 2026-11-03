/**
 * OneTeam behaviour spec for the WhatsApp campaign AccountInformationCard.
 *
 * Covers the empty state, translated and unavailable values, status
 * dots, and opening WhatsApp Manager with or without account ids.
 */
import { mount } from '@vue/test-utils';
import AccountInformationCard from '../AccountInformationCard.vue';

const KNOWN = new Set([
  'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.TIERS.TIER_1K',
  'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.TIER_NAMES.TIER_1K',
  'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.MODES.LIVE',
]);

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key, te: key => KNOWN.has(key) }),
}));

/**
 * Mounts the card.
 *
 * @param {object|null} healthData account health data
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountCard = healthData =>
  mount(AccountInformationCard, {
    props: { healthData },
    global: {
      directives: { tooltip: {} },
      stubs: {
        Button: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')" />',
        },
      },
    },
  });

describe('AccountInformationCard behaviour', () => {
  beforeEach(() => {
    window.open = vi.fn();
  });

  it('shows the empty state without health data', () => {
    expect(mountCard(null).text()).toContain(
      'CAMPAIGN.WHATSAPP.FORM.ACCOUNT_INFORMATION.EMPTY_STATE'
    );
  });

  it('shows translated values, unavailable values and dots', () => {
    const wrapper = mountCard({
      messaging_limit_tier: 'TIER_1K',
      account_mode: 'LIVE',
      quality_rating: 'PURPLE',
    });
    expect(wrapper.text()).toContain(
      'INBOX_MGMT.ACCOUNT_HEALTH.VALUES.MODES.LIVE'
    );
    expect(wrapper.text()).toContain(
      'CAMPAIGN.WHATSAPP.FORM.ACCOUNT_INFORMATION.UNAVAILABLE'
    );
    expect(wrapper.findAll('.rounded-full')).toHaveLength(1);
  });

  it('opens the business home without ids', async () => {
    await mountCard({}).find('button').trigger('click');
    expect(window.open).toHaveBeenCalledWith(
      'https://business.facebook.com/',
      '_blank'
    );
  });

  it('opens the phone numbers page with ids', async () => {
    await mountCard({ business_portfolio_id: 'p1', business_account_id: 'a1' })
      .find('button')
      .trigger('click');
    const [url] = window.open.mock.calls[0];
    expect(url).toContain('whatsapp_manager/phone_numbers');
    expect(url).toContain('business_id=p1');
    expect(url).toContain('asset_id=a1');
  });
});
