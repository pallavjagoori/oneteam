/**
 * OneTeam behaviour spec for the new SMS campaign popover.
 *
 * Covers creating the campaign (tracked as a one-off campaign, with a
 * success alert), the API or default error alert, and closing on cancel.
 */
import { mount, flushPromises } from '@vue/test-utils';
import SMSCampaignDialog from '../SMSCampaignDialog.vue';
import { useAlert, useTrack } from 'dashboard/composables';

const dispatch = vi.fn();

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const Form = {
  name: 'SMSCampaignForm',
  emits: ['submit', 'cancel'],
  template: '<form />',
};

describe('SMSCampaignDialog behaviour', () => {
  it('creates campaigns, alerts errors and closes', async () => {
    dispatch
      .mockResolvedValueOnce()
      .mockRejectedValueOnce({ response: { message: 'Bad' } })
      .mockRejectedValueOnce(new Error('x'));
    const wrapper = mount(SMSCampaignDialog, {
      global: { stubs: { SMSCampaignForm: Form } },
    });
    const form = wrapper.findComponent(Form);
    form.vm.$emit('submit', { title: 'Sale' });
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('campaigns/create', {
      title: 'Sale',
    });
    expect(useTrack).toHaveBeenCalledWith('Created a new campaign', {
      type: 'one_off',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'CAMPAIGN.SMS.CREATE.FORM.API.SUCCESS_MESSAGE'
    );
    form.vm.$emit('submit', {});
    form.vm.$emit('submit', {});
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Bad');
    expect(useAlert).toHaveBeenCalledWith(
      'CAMPAIGN.SMS.CREATE.FORM.API.ERROR_MESSAGE'
    );
    expect(wrapper.emitted('close')).toBeUndefined();
    form.vm.$emit('cancel');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
