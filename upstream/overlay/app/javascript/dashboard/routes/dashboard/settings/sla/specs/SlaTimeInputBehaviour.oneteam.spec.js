/**
 * OneTeam behaviour spec for the SLA threshold time input.
 *
 * Covers seeding the time and unit from props (and following prop
 * changes, ignoring NaN), emitting the unit on change, emitting the
 * numeric threshold or null with its validity, and the format error.
 * Chatwoot quirk: the error check reads a `numeric` rule that the
 * validations never define, so any invalid value shows the message.
 */
import { mount } from '@vue/test-utils';
import SlaTimeInput from '../SlaTimeInput.vue';

const WootInput = {
  name: 'WootInput',
  props: ['modelValue', 'label', 'placeholder', 'error'],
  emits: ['update:modelValue'],
  template: '<input class="time" />',
};

const mountInput = props =>
  mount(SlaTimeInput, {
    props,
    global: { stubs: { WootInput } },
  });

describe('SlaTimeInput behaviour', () => {
  it('seeds and follows the threshold and unit props', async () => {
    const wrapper = mountInput({
      threshold: 5,
      thresholdUnit: 'Hours',
      label: 'First response',
      placeholder: 'e.g. 5',
    });
    const input = wrapper.findComponent(WootInput);
    expect(input.props()).toMatchObject({
      modelValue: 5,
      label: 'First response',
      placeholder: 'e.g. 5',
      error: '',
    });
    expect(wrapper.find('select').element.value).toBe('Hours');
    expect(wrapper.findAll('option').map(o => o.text())).toEqual([
      'minutes',
      'hours',
      'days',
    ]);

    await wrapper.setProps({ threshold: 8, thresholdUnit: 'Days' });
    expect(input.props('modelValue')).toBe(8);
    expect(wrapper.find('select').element.value).toBe('Days');
    await wrapper.setProps({ threshold: Number.NaN });
    expect(input.props('modelValue')).toBe(8);
  });

  it('emits the unit when it changes', async () => {
    const wrapper = mountInput({});
    expect(wrapper.find('select').element.value).toBe('Minutes');
    await wrapper.find('select').setValue('Days');
    expect(wrapper.emitted('unit')[0]).toEqual(['Days']);
  });

  it('emits the threshold with its validity', async () => {
    const wrapper = mountInput({});
    const input = wrapper.findComponent(WootInput);
    expect(input.props('modelValue')).toBe(null);

    await input.vm.$emit('update:modelValue', '2.5');
    expect(wrapper.emitted('isInValid').at(-1)).toEqual([false]);
    expect(wrapper.emitted('updateThreshold').at(-1)).toEqual([2.5]);
    expect(input.props('error')).toBe('');

    await input.vm.$emit('update:modelValue', '0');
    expect(wrapper.emitted('isInValid').at(-1)).toEqual([true]);
    expect(wrapper.emitted('updateThreshold').at(-1)).toEqual([0]);
    expect(input.props('error')).toBe(
      'SLA.FORM.THRESHOLD_TIME.INVALID_FORMAT_ERROR'
    );
    expect(input.classes()).toContain('error');

    await input.vm.$emit('update:modelValue', '');
    expect(wrapper.emitted('updateThreshold').at(-1)).toEqual([null]);
  });
});
