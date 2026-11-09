/**
 * OneTeam behaviour spec for the live chat campaign form.
 *
 * Covers the website inbox options, loading inbox members as senders
 * (with the bot first, an empty response, and an error alert), filling
 * the form from a campaign in edit mode, validation messages (title,
 * message, inbox, URL pattern and scheme), submitting in create mode
 * (reset and cancel) and edit mode, hiding the buttons, and cancel.
 */
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert } from 'dashboard/composables';
import LiveChatCampaignForm from '../LiveChatCampaignForm.vue';

const dispatch = vi.fn();
const uiFlags = ref({ isCreating: false });
const inboxes = ref([]);

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: name => (name === 'campaigns/getUIFlags' ? uiFlags : inboxes),
}));

const Field = name => ({
  name,
  props: [
    'modelValue',
    'message',
    'messageType',
    'options',
    'disabled',
    'hasError',
    'label',
  ],
  emits: ['update:modelValue'],
  template: `<div class="${name}" />`,
});
const Input = Field('Input');
const Editor = Field('Editor');
const ComboBox = Field('ComboBox');
const Button = {
  name: 'Button',
  props: ['label', 'disabled', 'isLoading', 'type'],
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(\'click\')">{{ label }}</button>',
};

const campaign = {
  title: 'Spring',
  message: 'Hello!',
  inbox: { id: 3 },
  sender: { id: 9 },
  enabled: false,
  trigger_only_during_business_hours: true,
  trigger_rules: { url: 'https://acme.io/*', time_on_page: 5 },
};

const mountForm = props =>
  mount(LiveChatCampaignForm, {
    props: { mode: 'create', ...props },
    global: { stubs: { Input, Editor, ComboBox, Button } },
  });

const inputs = wrapper => wrapper.findAllComponents(Input);
const combos = wrapper => wrapper.findAllComponents(ComboBox);

const fill = async wrapper => {
  const [title, endPoint] = inputs(wrapper);
  await title.vm.$emit('update:modelValue', 'Spring');
  await wrapper.findComponent(Editor).vm.$emit('update:modelValue', 'Hi');
  await combos(wrapper)[0].vm.$emit('update:modelValue', 3);
  await endPoint.vm.$emit('update:modelValue', 'https://acme.io/*');
  await flushPromises();
};

describe('LiveChatCampaignForm behaviour', () => {
  beforeEach(() => {
    uiFlags.value = { isCreating: false };
    inboxes.value = [{ id: 3, name: 'Site' }];
    dispatch.mockResolvedValue({ data: { payload: [{ id: 9, name: 'Ann' }] } });
  });

  it('lists inboxes and loads senders for the picked inbox', async () => {
    const wrapper = mountForm();
    expect(combos(wrapper)[0].props('options')).toEqual([
      { value: 3, label: 'Site' },
    ]);
    expect(combos(wrapper)[1].props('disabled')).toBe(true);
    expect(combos(wrapper)[1].props('options')).toEqual([
      { value: 0, label: 'Bot' },
    ]);
    await combos(wrapper)[0].vm.$emit('update:modelValue', 3);
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('inboxMembers/get', { inboxId: 3 });
    expect(combos(wrapper)[1].props('options')).toEqual([
      { value: 0, label: 'Bot' },
      { value: 9, label: 'Ann' },
    ]);
    expect(combos(wrapper)[1].props('disabled')).toBe(false);
  });

  it('handles empty and failed sender lookups', async () => {
    inboxes.value = null;
    dispatch.mockResolvedValueOnce(undefined);
    const wrapper = mountForm();
    expect(combos(wrapper)[0].props('options')).toEqual([]);
    await combos(wrapper)[0].vm.$emit('update:modelValue', 3);
    await flushPromises();
    expect(combos(wrapper)[1].props('options')).toHaveLength(1);

    dispatch.mockRejectedValueOnce({ response: { message: 'No access' } });
    await combos(wrapper)[0].vm.$emit('update:modelValue', 4);
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('No access');

    dispatch.mockRejectedValueOnce({});
    await combos(wrapper)[0].vm.$emit('update:modelValue', 5);
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'CAMPAIGN.LIVE_CHAT.CREATE.FORM.API.ERROR_MESSAGE'
    );
    expect(combos(wrapper)[1].props('options')).toHaveLength(1);

    await wrapper.vm.$.setupState.handleInboxChange(null);
    expect(wrapper.vm.$.setupState.senderList).toEqual([]);
  });

  it('shows validation errors and blocks submit', async () => {
    const wrapper = mountForm();
    expect(wrapper.vm.isSubmitDisabled).toBe(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(inputs(wrapper)[0].props()).toMatchObject({
      message: 'CAMPAIGN.LIVE_CHAT.CREATE.FORM.TITLE.ERROR',
      messageType: 'error',
    });
    expect(wrapper.findComponent(Editor).props('messageType')).toBe('error');
    expect(combos(wrapper)[0].props('hasError')).toBe(true);
    expect(inputs(wrapper)[1].props('message')).toBe(
      'CAMPAIGN.LIVE_CHAT.CREATE.FORM.END_POINT.ERROR'
    );
    expect(inputs(wrapper)[2].props('messageType')).toBe('info');

    await inputs(wrapper)[1].vm.$emit('update:modelValue', 'ftp://acme.io');
    expect(inputs(wrapper)[1].props('messageType')).toBe('error');
    await inputs(wrapper)[1].vm.$emit(
      'update:modelValue',
      'https://acme.io/(('
    );
    expect(inputs(wrapper)[1].props('messageType')).toBe('error');
    await inputs(wrapper)[2].vm.$emit('update:modelValue', '');
    expect(inputs(wrapper)[2].props('message')).toBe(
      'CAMPAIGN.LIVE_CHAT.CREATE.FORM.TIME_ON_PAGE.ERROR'
    );
  });

  it('submits a new campaign, then resets and cancels', async () => {
    const wrapper = mountForm();
    await fill(wrapper);
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true);
    expect(wrapper.vm.isSubmitDisabled).toBe(false);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')[0][0]).toEqual({
      title: 'Spring',
      message: 'Hi',
      inbox_id: 3,
      sender_id: null,
      enabled: true,
      trigger_only_during_business_hours: true,
      trigger_rules: { url: 'https://acme.io/*', time_on_page: 10 },
    });
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(inputs(wrapper)[0].props('modelValue')).toBe('');
  });

  it('fills and submits an existing campaign in edit mode', async () => {
    const wrapper = mountForm({ mode: 'edit', selectedCampaign: campaign });
    await flushPromises();
    expect(inputs(wrapper)[0].props('modelValue')).toBe('Spring');
    expect(combos(wrapper)[1].props('modelValue')).toBe(9);
    expect(wrapper.vm.prepareCampaignDetails()).toMatchObject({
      sender_id: 9,
      enabled: false,
      trigger_rules: { url: 'https://acme.io/*', time_on_page: 5 },
    });
    expect(wrapper.findAll('button').map(b => b.text())).toEqual([
      'CAMPAIGN.LIVE_CHAT.CREATE.FORM.BUTTONS.CANCEL',
      'CAMPAIGN.LIVE_CHAT.CREATE.FORM.BUTTONS.EDIT',
    ]);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toBeUndefined();

    await wrapper.setProps({
      selectedCampaign: { ...campaign, sender: null, title: 'Summer' },
    });
    expect(inputs(wrapper)[0].props('modelValue')).toBe('Summer');
    expect(combos(wrapper)[1].props('modelValue')).toBe(0);
  });

  it('ignores the campaign in create mode and hides buttons', async () => {
    uiFlags.value = { isCreating: true };
    const wrapper = mountForm({
      selectedCampaign: campaign,
      showActionButtons: false,
    });
    expect(inputs(wrapper)[0].props('modelValue')).toBe('');
    expect(wrapper.findAll('button')).toHaveLength(0);

    const withButtons = mountForm();
    const [cancel, submit] = withButtons.findAllComponents(Button);
    expect(submit.props('isLoading')).toBe(true);
    await cancel.trigger('click');
    expect(withButtons.emitted('cancel')).toHaveLength(1);
  });
});
