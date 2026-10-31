/**
 * OneTeam behaviour spec for the SLA policy form.
 *
 * Covers an empty form (no policy), prefilling from an existing policy
 * (thresholds converted to minutes/hours/days), editing thresholds and
 * units, submitting (seconds conversion, empty thresholds, unknown
 * units), invalid time inputs and names disabling submit, the name
 * error state, updating state, and cancelling.
 */
import { flushPromises, mount } from '@vue/test-utils';
import SlaForm from '../SlaForm.vue';

const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'label', 'error'],
  emits: ['update:modelValue', 'input', 'blur'],
  template: '<input :data-label="label" :data-error="error" />',
};
const TimeInput = {
  name: 'SlaTimeInput',
  props: ['threshold', 'thresholdUnit', 'label'],
  emits: ['updateThreshold', 'unit', 'isInValid'],
  template: '<div class="time" />',
};
const NextButton = {
  name: 'NextButton',
  props: ['label', 'disabled', 'isLoading', 'type'],
  template: '<button :type="type" :disabled="disabled">{{ label }}</button>',
};
const Toggle = {
  name: 'ToggleSwitch',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<span />',
};

const mountForm = async (props = {}, flags = { isUpdating: false }) => {
  const wrapper = mount(SlaForm, {
    props: { submitLabel: 'Save', ...props },
    global: {
      stubs: {
        WootInput,
        SlaTimeInput: TimeInput,
        NextButton,
        ToggleSwitch: Toggle,
      },
      mocks: {
        $store: { getters: { 'sla/getUIFlags': flags } },
        $t: key => key,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const nameInput = wrapper => wrapper.findAllComponents(WootInput)[0];
const submitButton = wrapper =>
  wrapper.findAllComponents(NextButton).find(b => b.props('type') === 'submit');
const times = wrapper => wrapper.findAllComponents(TimeInput);

describe('SlaForm behaviour', () => {
  it('starts empty without a policy and requires a name', async () => {
    const wrapper = await mountForm();
    expect(nameInput(wrapper).props('modelValue')).toBe('');
    expect(times(wrapper).map(t => t.props('thresholdUnit'))).toEqual([
      'Minutes',
      'Minutes',
      'Minutes',
    ]);
    expect(submitButton(wrapper).props('disabled')).toBe(true);
    await nameInput(wrapper).vm.$emit('blur');
    await flushPromises();
    expect(wrapper.find('input').classes()).toContain('error');
    // Vuelidate 2 rule results are objects, so no specific message is chosen.
    expect(nameInput(wrapper).props('error')).toBe('');
    await nameInput(wrapper).vm.$emit('update:modelValue', 'Gold');
    await nameInput(wrapper).vm.$emit('input');
    await flushPromises();
    expect(submitButton(wrapper).props('disabled')).toBe(false);
  });

  it('prefills an existing policy', async () => {
    const wrapper = await mountForm({
      selectedResponse: {
        name: 'Gold',
        description: 'VIP',
        first_response_time_threshold: 300,
        next_response_time_threshold: 7200,
        resolution_time_threshold: 172800,
        only_during_business_hours: true,
      },
    });
    expect(nameInput(wrapper).props('modelValue')).toBe('Gold');
    expect(
      times(wrapper).map(t => [t.props('threshold'), t.props('thresholdUnit')])
    ).toEqual([
      [5, 'Minutes'],
      [2, 'Hours'],
      [2, 'Days'],
    ]);
    expect(wrapper.findComponent(Toggle).props('modelValue')).toBe(true);
  });

  it('submits thresholds in seconds', async () => {
    const wrapper = await mountForm({
      selectedResponse: { name: 'Gold', description: 'd' },
    });
    await times(wrapper)[0].vm.$emit('updateThreshold', 2);
    await times(wrapper)[0].vm.$emit('unit', 'Hours');
    await times(wrapper)[1].vm.$emit('updateThreshold', 0);
    await times(wrapper)[2].vm.$emit('updateThreshold', 3);
    await times(wrapper)[2].vm.$emit('unit', 'Weeks');
    await wrapper.findComponent(Toggle).vm.$emit('update:modelValue', true);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submitSla')[0][0]).toEqual({
      name: 'Gold',
      description: 'd',
      first_response_time_threshold: 7200,
      next_response_time_threshold: null,
      resolution_time_threshold: 3,
      only_during_business_hours: true,
    });
  });

  it('disables submit for invalid times or while updating', async () => {
    const wrapper = await mountForm({ selectedResponse: { name: 'Gold' } });
    expect(submitButton(wrapper).props('disabled')).toBe(false);
    await times(wrapper)[1].vm.$emit('isInValid', true);
    expect(submitButton(wrapper).props('disabled')).toBe(true);
    await times(wrapper)[1].vm.$emit('isInValid', false);
    expect(submitButton(wrapper).props('disabled')).toBe(false);

    const updating = await mountForm(
      { selectedResponse: { name: 'Gold' } },
      { isUpdating: true }
    );
    expect(submitButton(updating).props()).toMatchObject({
      disabled: true,
      isLoading: true,
    });
  });

  it('closes from cancel', async () => {
    const wrapper = await mountForm();
    await wrapper.find('button[type="reset"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
