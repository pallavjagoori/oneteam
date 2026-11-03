/**
 * OneTeam behaviour spec for the date picker trigger button.
 *
 * Covers the range label (or a custom navigation label), formatting
 * ranges inside one year and across years, the placeholder for invalid
 * dates, opening the picker, and the previous/next period buttons.
 */
import { mount } from '@vue/test-utils';
import DatePickerButton from '../DatePickerButton.vue';

const NextButton = {
  name: 'NextButton',
  props: { icon: String, disabled: Boolean },
  emits: ['click'],
  template: '<button class="nav" />',
};

/**
 * Mounts the button with stubbed icons and buttons.
 *
 * @param {object} props Button props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountButton = props =>
  mount(DatePickerButton, {
    props: { selectedRange: 'last7days', ...props },
    global: {
      stubs: { NextButton, Icon: true },
      directives: { tooltip: {} },
      mocks: { $t: key => key },
    },
  });

describe('DatePickerButton behaviour', () => {
  it('shows a same-year range and opens the picker', async () => {
    const wrapper = mountButton({
      selectedStartDate: new Date(2024, 0, 1),
      selectedEndDate: new Date(2024, 0, 7),
    });
    expect(wrapper.text()).toContain(
      'DATE_PICKER.DATE_RANGE_OPTIONS.LAST_7_DAYS'
    );
    expect(wrapper.text()).toContain('Jan 1 - Jan 7, 2024');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('open')).toHaveLength(1);
    expect(wrapper.findComponent(NextButton).exists()).toBe(false);
  });

  it('shows years for ranges across years and a custom label', () => {
    const wrapper = mountButton({
      selectedStartDate: new Date(2023, 11, 30),
      selectedEndDate: new Date(2024, 0, 2),
      navigationLabel: 'December',
    });
    expect(wrapper.text()).toContain('Dec 30, 2023 - Jan 2, 2024');
    expect(wrapper.text()).toContain('December');
  });

  it('asks for a range when the dates are invalid', () => {
    const wrapper = mountButton({ selectedStartDate: new Date('x') });
    expect(wrapper.text()).toContain('Select a date range');
  });

  it('navigates to the previous and next period', () => {
    const wrapper = mountButton({
      selectedStartDate: new Date(2024, 0, 1),
      selectedEndDate: new Date(2024, 0, 31),
      showMonthNavigation: true,
    });
    const [prev, next] = wrapper.findAllComponents(NextButton);
    expect(next.props('disabled')).toBe(true);
    prev.vm.$emit('click');
    next.vm.$emit('click');
    expect(wrapper.emitted('navigateMonth')).toEqual([['prev'], ['next']]);
  });
});
