/**
 * OneTeam behaviour spec for the delete campaign confirmation.
 *
 * Covers the WhatsApp and default descriptions, deleting with success
 * and error alerts, skipping without an id, and closing afterwards.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ConfirmDeleteCampaignDialog from '../ConfirmDeleteCampaignDialog.vue';
import { useAlert } from 'dashboard/composables';

const dispatch = vi.fn();
const close = vi.fn();

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Dialog = {
  name: 'Dialog',
  props: ['description'],
  emits: ['confirm'],
  setup: () => ({ close }),
  template: '<div />',
};
const mountDialog = selectedCampaign =>
  mount(ConfirmDeleteCampaignDialog, {
    props: { selectedCampaign },
    global: { stubs: { Dialog } },
  });
const confirm = async wrapper => {
  wrapper.findComponent(Dialog).vm.$emit('confirm');
  await flushPromises();
};

describe('ConfirmDeleteCampaignDialog behaviour', () => {
  it('describes WhatsApp and other campaigns', () => {
    expect(
      mountDialog({ inbox: { channel_type: 'Channel::Whatsapp' } })
        .findComponent(Dialog)
        .props('description')
    ).toBe('CAMPAIGN.CONFIRM_DELETE.WHATSAPP_DESCRIPTION');
    const wrapper = mountDialog(null);
    expect(wrapper.findComponent(Dialog).props('description')).toBe(
      'CAMPAIGN.CONFIRM_DELETE.DESCRIPTION'
    );
    expect(wrapper.vm.dialogRef).toBeTruthy();
  });

  it('deletes with alerts and skips without an id', async () => {
    dispatch.mockResolvedValueOnce().mockRejectedValueOnce(new Error('x'));
    const wrapper = mountDialog({ id: 3 });
    await confirm(wrapper);
    await confirm(wrapper);
    expect(dispatch).toHaveBeenCalledWith('campaigns/delete', 3);
    expect(useAlert).toHaveBeenCalledWith(
      'CAMPAIGN.CONFIRM_DELETE.API.SUCCESS_MESSAGE'
    );
    expect(useAlert).toHaveBeenCalledWith(
      'CAMPAIGN.CONFIRM_DELETE.API.ERROR_MESSAGE'
    );
    await confirm(mountDialog({}));
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(3);
  });
});
