/**
 * OneTeam behaviour spec for the live chat campaigns page.
 *
 * Covers the spinner while campaigns load, the empty state, the campaign
 * list, opening and closing the new campaign dialog, and opening the edit
 * and delete dialogs for the chosen campaign.
 */
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import LiveChatCampaignsPage from '../LiveChatCampaignsPage.vue';

const env = vi.hoisted(() => ({ campaigns: null, uiFlags: null, log: [] }));

vi.mock('dashboard/composables/store', () => ({
  useStoreGetters: () => ({ 'campaigns/getLiveChatCampaigns': env.campaigns }),
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

const CampaignLayout = {
  name: 'CampaignLayout',
  emits: ['click', 'close'],
  template:
    '<div><button class="new" @click="$emit(\'click\')" /><slot name="action" /><slot /></div>',
};
const CampaignList = {
  name: 'CampaignList',
  props: ['campaigns'],
  emits: ['edit', 'delete'],
  template: '<ul class="list" />',
};
const dialogStub = name => ({
  name,
  props: ['selectedCampaign'],
  setup: () => ({
    dialogRef: { open: () => env.log.push(`${name} open`) },
  }),
  template: '<div />',
});
const EditDialog = dialogStub('EditLiveChatCampaignDialog');
const DeleteDialog = dialogStub('ConfirmDeleteCampaignDialog');
const NewDialog = {
  name: 'LiveChatCampaignDialog',
  emits: ['close'],
  template: '<div class="new-dialog" />',
};

const mountPage = ({ campaigns = [], isFetching = false } = {}) => {
  env.campaigns = ref(campaigns);
  env.uiFlags = ref({ isFetching });
  return mount(LiveChatCampaignsPage, {
    global: {
      stubs: {
        CampaignLayout,
        CampaignList,
        EditLiveChatCampaignDialog: EditDialog,
        ConfirmDeleteCampaignDialog: DeleteDialog,
        LiveChatCampaignDialog: NewDialog,
        LiveChatCampaignEmptyState: { template: '<p class="empty" />' },
        Spinner: { template: '<i class="spinner" />' },
      },
    },
  });
};

describe('LiveChatCampaignsPage behaviour', () => {
  beforeEach(() => {
    env.log = [];
  });

  it('shows a spinner while loading, then the empty state', () => {
    const loading = mountPage({ isFetching: true });
    expect(loading.find('.spinner').exists()).toBe(true);
    expect(loading.find('.empty').exists()).toBe(false);
    expect(mountPage().find('.empty').exists()).toBe(true);
  });

  it('opens and closes the new campaign dialog', async () => {
    const wrapper = mountPage();
    expect(wrapper.find('.new-dialog').exists()).toBe(false);
    await wrapper.find('.new').trigger('click');
    expect(wrapper.find('.new-dialog').exists()).toBe(true);
    await wrapper.findComponent(NewDialog).vm.$emit('close');
    expect(wrapper.find('.new-dialog').exists()).toBe(false);
    await wrapper.find('.new').trigger('click');
    await wrapper.findComponent(CampaignLayout).vm.$emit('close');
    expect(wrapper.find('.new-dialog').exists()).toBe(false);
  });

  it('lists campaigns and opens the edit and delete dialogs', async () => {
    const campaign = { id: 3, title: 'Welcome' };
    const wrapper = mountPage({ campaigns: [campaign] });
    const list = wrapper.findComponent(CampaignList);
    expect(list.props('campaigns')).toEqual([campaign]);

    await list.vm.$emit('edit', campaign);
    expect(wrapper.findComponent(EditDialog).props('selectedCampaign')).toEqual(
      campaign
    );
    await list.vm.$emit('delete', campaign);
    expect(
      wrapper.findComponent(DeleteDialog).props('selectedCampaign')
    ).toEqual(campaign);
    expect(env.log).toEqual([
      'EditLiveChatCampaignDialog open',
      'ConfirmDeleteCampaignDialog open',
    ]);
  });
});
