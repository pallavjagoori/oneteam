/**
 * OneTeam behaviour spec for the new SMS campaign form.
 *
 * Covers inbox and label options (and missing lists), validation errors
 * on an empty submit, building the campaign payload with a UTC schedule
 * and label audience, resetting and closing after submit, cancelling, the
 * busy submit button, and the null fallbacks in the payload helpers.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import SMSCampaignForm from '../SMSCampaignForm.vue';

const env = vi.hoisted(() => ({ labels: [], inboxes: [], flags: {} }));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    ref(
      {
        'campaigns/getUIFlags': env.flags,
        'labels/getLabels': env.labels,
        'inboxes/getSMSInboxes': env.inboxes,
      }[name]
    ),
}));

const field = name => ({
  name,
  props: ['modelValue', 'message', 'messageType', 'options', 'hasError'],
  emits: ['update:modelValue'],
  template: '<i />',
});
const Button = {
  name: 'Button',
  props: ['label', 'type', 'isLoading'],
  emits: ['click'],
  template:
    '<button :type="type" @click="$emit(\'click\')">{{ label }}</button>',
};

const mountForm = () =>
  mount(SMSCampaignForm, {
    global: {
      stubs: {
        Input: field('Input'),
        TextArea: field('TextArea'),
        ComboBox: field('ComboBox'),
        TagMultiSelectComboBox: field('TagMultiSelectComboBox'),
        Button,
      },
    },
  });

describe('SMSCampaignForm behaviour', () => {
  beforeEach(() => {
    env.labels = [{ id: 3, title: 'vip' }];
    env.inboxes = [{ id: 5, name: 'SMS' }];
    env.flags = {};
  });

  it('validates, submits the campaign and resets', async () => {
    const wrapper = mountForm();
    const combo = wrapper.findComponent({ name: 'ComboBox' });
    expect(combo.props('options')).toEqual([{ value: 5, label: 'SMS' }]);
    expect(
      wrapper.findComponent({ name: 'TagMultiSelectComboBox' }).props('options')
    ).toEqual([{ value: 3, label: 'vip' }]);

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toBeUndefined();
    const [title, schedule] = wrapper.findAllComponents({ name: 'Input' });
    expect(title.props()).toMatchObject({
      message: 'CAMPAIGN.SMS.CREATE.FORM.TITLE.ERROR',
      messageType: 'error',
    });
    expect(combo.props('hasError')).toBe(true);

    title.vm.$emit('update:modelValue', 'Sale');
    wrapper
      .findComponent({ name: 'TextArea' })
      .vm.$emit('update:modelValue', 'Hi');
    combo.vm.$emit('update:modelValue', 5);
    wrapper
      .findComponent({ name: 'TagMultiSelectComboBox' })
      .vm.$emit('update:modelValue', [3]);
    schedule.vm.$emit('update:modelValue', '2030-01-02T03:04');
    await wrapper.vm.$nextTick();
    expect(title.props('messageType')).toBe('info');

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          title: 'Sale',
          message: 'Hi',
          inbox_id: 5,
          scheduled_at: new Date('2030-01-02T03:04').toISOString(),
          audience: [{ id: 3, type: 'Label' }],
        },
      ],
    ]);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(title.props('modelValue')).toBe('');
  });

  it('cancels, shows a busy button and handles missing lists', async () => {
    env.labels = null;
    env.inboxes = undefined;
    env.flags = { isCreating: true };
    const wrapper = mountForm();
    expect(
      wrapper.findComponent({ name: 'ComboBox' }).props('options')
    ).toEqual([]);
    const [cancel, create] = wrapper.findAllComponents(Button);
    expect(create.props('isLoading')).toBe(true);
    await cancel.trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);

    expect(wrapper.vm.formatToUTCString(null)).toBe(null);
    wrapper.vm.state.selectedAudience = null;
    expect(wrapper.vm.prepareCampaignDetails().audience).toBeUndefined();
  });
});
