/**
 * OneTeam behaviour spec for the edit live chat campaign dialog.
 *
 * Covers the confirm button state (busy or invalid form), saving the
 * form's campaign details on confirm or form submit, closing with a
 * success alert, the API or default error alert, and exposing the dialog.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import EditLiveChatCampaignDialog from '../EditLiveChatCampaignDialog.vue';
import { useAlert } from 'dashboard/composables';

const dispatch = vi.fn();
const flags = ref({});
const close = vi.fn();
const form = vi.hoisted(() => ({ invalid: false }));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: () => flags,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const Dialog = {
  name: 'Dialog',
  props: ['isLoading', 'disableConfirmButton'],
  emits: ['confirm'],
  setup: () => ({ close }),
  template: '<div><slot /></div>',
};
const Form = {
  name: 'LiveChatCampaignForm',
  props: ['selectedCampaign'],
  emits: ['submit'],
  setup: () => ({
    isSubmitDisabled: form.invalid,
    prepareCampaignDetails: () => ({ title: 'New' }),
  }),
  template: '<form />',
};

const mountDialog = () =>
  mount(EditLiveChatCampaignDialog, {
    props: { selectedCampaign: { id: 6 } },
    global: { stubs: { Dialog, LiveChatCampaignForm: Form } },
  });

describe('EditLiveChatCampaignDialog behaviour', () => {
  beforeEach(() => {
    flags.value = {};
    form.invalid = false;
  });

  it('saves the campaign and closes', async () => {
    dispatch.mockResolvedValue();
    const wrapper = mountDialog();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.dialogRef).toBeTruthy();
    expect(wrapper.findComponent(Dialog).props()).toMatchObject({
      isLoading: undefined,
      disableConfirmButton: false,
    });
    expect(wrapper.findComponent(Form).props('selectedCampaign')).toEqual({
      id: 6,
    });
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('campaigns/update', {
      id: 6,
      title: 'New',
    });
    expect(useAlert).toHaveBeenCalledWith(
      'CAMPAIGN.LIVE_CHAT.EDIT.FORM.API.SUCCESS_MESSAGE'
    );
    expect(close).toHaveBeenCalled();
  });

  it('disables confirm while busy or invalid and alerts failures', async () => {
    form.invalid = true;
    flags.value = { isUpdating: true };
    dispatch.mockRejectedValueOnce({ response: { message: 'Bad' } });
    dispatch.mockRejectedValueOnce(new Error('x'));
    const wrapper = mountDialog();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(Dialog).props()).toMatchObject({
      isLoading: true,
      disableConfirmButton: true,
    });
    flags.value = {};
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(Dialog).props('disableConfirmButton')).toBe(
      true
    );

    wrapper.findComponent(Form).vm.$emit('submit');
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Bad');
    expect(useAlert).toHaveBeenCalledWith(
      'CAMPAIGN.LIVE_CHAT.EDIT.FORM.API.ERROR_MESSAGE'
    );
    expect(close).not.toHaveBeenCalled();
  });
});
