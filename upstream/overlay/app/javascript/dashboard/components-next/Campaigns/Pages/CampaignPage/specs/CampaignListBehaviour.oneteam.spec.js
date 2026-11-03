/**
 * OneTeam behaviour spec for the campaigns list.
 *
 * Covers passing each campaign to its card, showing analytics only for
 * processing or completed WhatsApp campaigns on Enterprise, and relaying
 * edit, delete and analytics with the campaign.
 */
import { mount } from '@vue/test-utils';
import CampaignList from '../CampaignList.vue';

const env = vi.hoisted(() => ({
  enterprise: true,
  view: true,
  paywall: false,
}));

vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: env.enterprise }),
}));
vi.mock('dashboard/composables/useCampaignAnalytics', () => ({
  useCampaignAnalytics: () => ({
    canViewAnalytics: env.view,
    showPaywall: env.paywall,
  }),
}));

const CampaignCard = {
  name: 'CampaignCard',
  props: { title: String, showAnalytics: Boolean, showEdit: Boolean },
  emits: ['edit', 'delete', 'analytics'],
  template: '<div />',
};

const campaigns = [
  {
    id: 1,
    title: 'Promo',
    campaign_status: 'completed',
    inbox: { channel_type: 'Channel::Whatsapp' },
  },
  { id: 2, title: 'Draft', campaign_status: 'active', inbox: null },
];

/**
 * Mounts the list.
 *
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountList = () =>
  mount(CampaignList, {
    props: { campaigns, showEdit: true },
    global: { stubs: { CampaignCard } },
  });

describe('CampaignList behaviour', () => {
  it('relays card actions and shows analytics where allowed', () => {
    env.enterprise = true;
    const wrapper = mountList();
    const [promo, draft] = wrapper.findAllComponents(CampaignCard);
    expect(promo.props()).toMatchObject({
      title: 'Promo',
      showAnalytics: true,
      showEdit: true,
    });
    expect(draft.props('showAnalytics')).toBe(false);
    promo.vm.$emit('edit');
    promo.vm.$emit('delete');
    promo.vm.$emit('analytics');
    expect(wrapper.emitted('edit')).toEqual([[campaigns[0]]]);
    expect(wrapper.emitted('delete')).toEqual([[campaigns[0]]]);
    expect(wrapper.emitted('analytics')).toEqual([[campaigns[0]]]);
  });

  it.each([
    [true, true],
    [false, false],
  ])(
    'shows the paywall entry (%s) without analytics access',
    (paywall, shown) => {
      env.enterprise = true;
      env.view = false;
      env.paywall = paywall;
      expect(
        mountList().findAllComponents(CampaignCard)[0].props('showAnalytics')
      ).toBe(shown);
      env.view = true;
    }
  );

  it('hides analytics outside Enterprise', () => {
    env.enterprise = false;
    expect(
      mountList().findAllComponents(CampaignCard)[0].props('showAnalytics')
    ).toBe(false);
  });
});
