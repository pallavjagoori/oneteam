/**
 * OneTeam behaviour spec for the WhatsApp campaigns page.
 *
 * Covers the spinner, empty state and list, and the create, edit,
 * analytics and delete actions.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import WhatsAppCampaignsPage from '../WhatsAppCampaignsPage.vue';

const env = vi.hoisted(() => ({
  campaigns: null,
  uiFlags: null,
  push: vi.fn(),
  log: [],
}));

vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({ 'campaigns/getWhatsAppCampaigns': env.campaigns }),
  useMapGetter: () => env.uiFlags,
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const CampaignLayout = {
  name: 'CampaignLayout',
  emits: ['click'],
  template:
    '<div><button class="new" @click="$emit(\'click\')" /><slot /></div>',
};
const CampaignList = {
  name: 'CampaignList',
  props: ['campaigns'],
  emits: ['edit', 'delete', 'analytics'],
  template: '<ul class="list" />',
};
const DeleteDialog = {
  name: 'ConfirmDeleteCampaignDialog',
  props: ['selectedCampaign'],
  setup: () => ({ dialogRef: { open: () => env.log.push('delete open') } }),
  template: '<div />',
};

/**
 * Mounts the page with campaign state.
 *
 * @param {object} options
 * @param {Array|null} [options.campaigns] WhatsApp campaigns
 * @param {boolean} [options.isFetching] fetching flag
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = ({ campaigns = [], isFetching = false } = {}) => {
  env.campaigns = ref(campaigns);
  env.uiFlags = ref({ isFetching });
  return mount(WhatsAppCampaignsPage, {
    global: {
      stubs: {
        CampaignLayout,
        CampaignList,
        ConfirmDeleteCampaignDialog: DeleteDialog,
        WhatsAppCampaignEmptyState: { template: '<p class="empty" />' },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });
};

describe('WhatsAppCampaignsPage behaviour', () => {
  beforeEach(() => {
    env.log = [];
  });

  it('shows the spinner while fetching', () => {
    expect(mountPage({ isFetching: true }).find('.spinner').exists()).toBe(
      true
    );
  });

  it('shows the empty state without campaigns', () => {
    expect(mountPage().find('.empty').exists()).toBe(true);
  });

  it('shows the list when campaigns are missing', () => {
    expect(mountPage({ campaigns: null }).find('.list').exists()).toBe(true);
  });

  it('routes to create, edit and analytics', async () => {
    const wrapper = mountPage({ campaigns: [{ id: 4 }] });
    await wrapper.find('.new').trigger('click');
    const list = wrapper.findComponent(CampaignList);
    list.vm.$emit('edit', { id: 4 });
    list.vm.$emit('analytics', { id: 4 });
    expect(env.push.mock.calls).toEqual([
      [{ name: 'campaigns_whatsapp_new' }],
      [{ name: 'campaigns_whatsapp_edit', params: { campaignId: 4 } }],
      [{ name: 'campaigns_whatsapp_analytics', params: { campaignId: 4 } }],
    ]);
  });

  it('opens the delete dialog for a campaign', async () => {
    const wrapper = mountPage({ campaigns: [{ id: 4 }] });
    wrapper.findComponent(CampaignList).vm.$emit('delete', { id: 4 });
    await wrapper.vm.$nextTick();
    expect(env.log).toEqual(['delete open']);
    expect(
      wrapper.findComponent(DeleteDialog).props('selectedCampaign')
    ).toEqual({
      id: 4,
    });
  });
});
