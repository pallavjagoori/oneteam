/**
 * OneTeam behaviour spec for the SMS campaigns page.
 *
 * Covers the spinner while campaigns load, the empty state, the campaign
 * list, opening and closing the new campaign dialog, and opening the
 * delete dialog for the chosen campaign.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import SMSCampaignsPage from '../SMSCampaignsPage.vue';

const env = vi.hoisted(() => ({ campaigns: null, uiFlags: null, log: [] }));

vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({ 'campaigns/getSMSCampaigns': env.campaigns }),
  useMapGetter: () => env.uiFlags,
}));
vi.mock('@vueuse/core', async importOriginal => {
  const { ref: appRef } = await import('vue');
  return {
    ...(await importOriginal()),
    useToggle: () => {
      const state = appRef(false);
      return [
        state,
        value => {
          state.value = typeof value === 'boolean' ? value : !state.value;
        },
      ];
    },
  };
});
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));

const CampaignLayout = {
  name: 'CampaignLayout',
  emits: ['click', 'close'],
  template:
    '<div><button class="new" @click="$emit(\'click\')" /><button class="close" @click="$emit(\'close\')" /><slot name="action" /><slot /></div>',
};
const CampaignList = {
  name: 'CampaignList',
  props: ['campaigns'],
  emits: ['delete'],
  template: '<ul class="list" />',
};
const DeleteDialog = {
  name: 'ConfirmDeleteCampaignDialog',
  props: ['selectedCampaign'],
  setup: () => ({
    dialogRef: { open: () => env.log.push('delete open') },
  }),
  template: '<div />',
};
const NewDialog = {
  name: 'SMSCampaignDialog',
  emits: ['close'],
  template: '<div class="new-dialog" />',
};

/**
 * Mounts the page with campaign state.
 *
 * @param {object} options
 * @param {Array} [options.campaigns] SMS campaigns
 * @param {boolean} [options.isFetching] fetching flag
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = ({ campaigns = [], isFetching = false } = {}) => {
  env.campaigns = ref(campaigns);
  env.uiFlags = ref({ isFetching });
  return mount(SMSCampaignsPage, {
    global: {
      stubs: {
        CampaignLayout,
        CampaignList,
        ConfirmDeleteCampaignDialog: DeleteDialog,
        SMSCampaignDialog: NewDialog,
        SMSCampaignEmptyState: { template: '<p class="empty" />' },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });
};

describe('SMSCampaignsPage behaviour', () => {
  beforeEach(() => {
    env.log = [];
  });

  it('shows the spinner while fetching', () => {
    const wrapper = mountPage({ isFetching: true });
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.find('.empty').exists()).toBe(false);
  });

  it('shows the empty state without campaigns', () => {
    expect(mountPage().find('.empty').exists()).toBe(true);
  });

  it('lists campaigns and opens the delete dialog', async () => {
    const campaign = { id: 3 };
    const wrapper = mountPage({ campaigns: [campaign] });
    wrapper.findComponent(CampaignList).vm.$emit('delete', campaign);
    await wrapper.vm.$nextTick();
    expect(env.log).toEqual(['delete open']);
    expect(
      wrapper.findComponent(DeleteDialog).props('selectedCampaign')
    ).toEqual(campaign);
  });

  it('opens and closes the new campaign dialog', async () => {
    const wrapper = mountPage({ campaigns: [{ id: 1 }] });
    await wrapper.find('.new').trigger('click');
    expect(wrapper.find('.new-dialog').exists()).toBe(true);
    wrapper.findComponent(NewDialog).vm.$emit('close');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.new-dialog').exists()).toBe(false);
    await wrapper.find('.new').trigger('click');
    await wrapper.find('.close').trigger('click');
    expect(wrapper.find('.new-dialog').exists()).toBe(false);
  });

  it('treats a missing campaign list as not empty', () => {
    expect(mountPage({ campaigns: null }).find('.list').exists()).toBe(true);
  });
});
