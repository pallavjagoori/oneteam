/**
 * OneTeam behaviour spec for the date time picker wrapper.
 *
 * Covers forwarding the picked date and disabling days before
 * yesterday.
 */
import { mount } from '@vue/test-utils';
import { addDays } from 'date-fns';
import DateTimePicker from '../DateTimePicker.vue';

describe('DateTimePicker behaviour', () => {
  it('forwards changes and disables past days', () => {
    const wrapper = mount(DateTimePicker, {
      props: { value: new Date() },
      global: {
        stubs: {
          DatePicker: {
            name: 'DatePicker',
            props: ['disabledDate'],
            emits: ['change'],
            template: '<div />',
          },
        },
      },
    });
    const picker = wrapper.findComponent({ name: 'DatePicker' });
    const picked = new Date();
    picker.vm.$emit('change', picked);
    expect(wrapper.emitted('change')).toEqual([[picked]]);

    const isDisabled = picker.props('disabledDate');
    expect(isDisabled(addDays(new Date(), -3))).toBe(true);
    expect(isDisabled(addDays(new Date(), 1))).toBe(false);
  });
});
