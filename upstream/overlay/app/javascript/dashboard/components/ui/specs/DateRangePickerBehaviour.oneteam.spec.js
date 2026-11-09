/**
 * OneTeam behaviour spec for the date range picker wrapper.
 *
 * Covers forwarding the picked range.
 */
import { mount } from '@vue/test-utils';
import DateRangePicker from '../DateRangePicker.vue';

describe('DateRangePicker behaviour', () => {
  it('forwards the picked range', () => {
    const wrapper = mount(DateRangePicker, {
      global: {
        stubs: {
          DatePicker: {
            name: 'DatePicker',
            emits: ['change'],
            template: '<div />',
          },
        },
      },
    });
    const range = [new Date(), new Date()];
    wrapper.findComponent({ name: 'DatePicker' }).vm.$emit('change', range);
    expect(wrapper.emitted('change')).toEqual([[range]]);
  });
});
