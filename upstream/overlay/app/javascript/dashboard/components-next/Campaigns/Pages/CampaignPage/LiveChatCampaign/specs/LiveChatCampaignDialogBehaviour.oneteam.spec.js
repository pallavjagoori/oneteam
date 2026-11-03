/**
 * OneTeam behaviour spec for the new live chat campaign popover.
 *
 * Covers creating the campaign (tracked as an ongoing campaign, with a
 * success alert) and closing straight away, the API or default error
 * alert when creation fails, and cancelling.
 */
import { mount, flushPromises } from '@vue/test-utils';
import LiveChatCampaignDialog from '../LiveChatCampaignDialog.vue';
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
  name: 'LiveChatCampaignForm',
  emits: ['submit', 'cancel'],
  template: '<form />',
};
const mountDialog = () =>
  mount(LiveChatCampaignDialog, {
    global: { stubs: { LiveChatCampaignForm: Form } },
  });

describe('LiveChatCampaignDialog behaviour', () => {
  it('creates the campaign, tracks it and closes', async () => {
    dispatch.mockResolvedValue();
    const wrapper = mountDialog();
    wrapper.findComponent(Form).vm.$emit('submit', { title: 'Hi' });
    expect(wrapper.emitted('close')).toHaveLength(1);
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('campaigns/create', { title: 'Hi' });
    expect(useTrack).toHaveBeenCalledWith('Created a new campaign', {
      type: 'ongoing',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'CAMPAIGN.LIVE_CHAT.CREATE.FORM.API.SUCCESS_MESSAGE'
    );
  });

  it('alerts the API or default error and cancels', async () => {
    dispatch.mockRejectedValueOnce({ response: { message: 'Taken' } });
    dispatch.mockRejectedValueOnce(new Error('x'));
    const wrapper = mountDialog();
    const form = wrapper.findComponent(Form);
    form.vm.$emit('submit', {});
    form.vm.$emit('submit', {});
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Taken');
    expect(useAlert).toHaveBeenCalledWith(
      'CAMPAIGN.LIVE_CHAT.CREATE.FORM.API.ERROR_MESSAGE'
    );
    form.vm.$emit('cancel');
    expect(wrapper.emitted('close')).toHaveLength(3);
  });
});
