/**
 * OneTeam behaviour spec for the date picker range list and footer.
 *
 * Covers listing the preset ranges with separators, marking and picking
 * a range, and the clear and apply actions.
 */
import { mount } from '@vue/test-utils';
import CalendarDateRange from '../CalendarDateRange.vue';
import CalendarFooter from '../CalendarFooter.vue';
import { dateRanges } from '../../helpers/DatePickerHelper';

const NextButton = {
  name: 'NextButton',
  props: ['label'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
};

describe('date picker panels behaviour', () => {
  it('lists preset ranges and picks one', async () => {
    const selected = dateRanges.find(range => range.value);
    const wrapper = mount(CalendarDateRange, {
      props: { selectedRange: selected.value },
      global: { mocks: { $t: key => key } },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(dateRanges.length);
    expect(wrapper.findAll('.border-t')).toHaveLength(
      dateRanges.filter(range => range.separator).length
    );
    const index = dateRanges.indexOf(selected);
    expect(buttons[index].classes()).toContain('bg-n-alpha-1');
    await buttons[index].trigger('click');
    expect(wrapper.emitted('setRange')).toEqual([[selected]]);
  });

  it('clears or applies the selection', async () => {
    const wrapper = mount(CalendarFooter, {
      global: { stubs: { NextButton }, mocks: { $t: key => key } },
    });
    const [clear, apply] = wrapper.findAll('button');
    expect(clear.text()).toBe('DATE_PICKER.CLEAR_BUTTON');
    await clear.trigger('click');
    await apply.trigger('click');
    expect(wrapper.emitted('clear')).toHaveLength(1);
    expect(wrapper.emitted('change')).toHaveLength(1);
  });
});
