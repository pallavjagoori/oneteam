/**
 * OneTeam behaviour spec for the reports date range picker.
 *
 * Time is frozen on Wednesday 15 May 2024 so ranges are deterministic.
 * Child calendars are shallow stubs; the spec drives them through their
 * events and reads the resulting state back from their props.
 */
import { shallowMount } from '@vue/test-utils';
import DatePicker from '../DatePicker.vue';
import DatePickerButton from '../components/DatePickerButton.vue';
import CalendarDateInput from '../components/CalendarDateInput.vue';
import CalendarDateRange from '../components/CalendarDateRange.vue';
import CalendarYear from '../components/CalendarYear.vue';
import CalendarMonth from '../components/CalendarMonth.vue';
import CalendarWeek from '../components/CalendarWeek.vue';
import CalendarFooter from '../components/CalendarFooter.vue';

const env = vi.hoisted(() => ({ clickaway: null }));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, args) => `${key}:${JSON.stringify(args)}` }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const { useAlert } = await import('dashboard/composables');

const day = (m, d, ...time) => new Date(2024, m, d, ...time);
const startOf = (m, d) => day(m, d, 0, 0, 0, 0);
const endOf = (m, d) => day(m, d, 23, 59, 59, 999);

const mountPicker = (props = {}) =>
  shallowMount(DatePicker, {
    props,
    global: {
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
    },
  });

const button = wrapper => wrapper.findComponent(DatePickerButton);
const weeks = wrapper => wrapper.findAllComponents(CalendarWeek);
const inputs = wrapper => wrapper.findAllComponents(CalendarDateInput);
const months = wrapper => [
  weeks(wrapper)[0].props('startCurrentDate'),
  weeks(wrapper)[0].props('endCurrentDate'),
];
const open = async wrapper => {
  await button(wrapper).vm.$emit('open');
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(day(4, 15, 10, 30));
  env.clickaway = null;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DatePicker initial state', () => {
  it('defaults to the last seven days with the picker closed', () => {
    const wrapper = mountPicker();
    expect(button(wrapper).props()).toMatchObject({
      selectedStartDate: startOf(4, 9),
      selectedEndDate: endOf(4, 15),
      selectedRange: 'last7days',
      showMonthNavigation: false,
      canNavigateNext: false,
      navigationLabel: null,
    });
    expect(wrapper.findComponent(CalendarDateRange).exists()).toBe(false);
  });

  it('opens straight away when no range has been applied', () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    expect(wrapper.findComponent(CalendarDateRange).exists()).toBe(true);
    expect(months(wrapper)).toEqual([startOf(4, 1), startOf(5, 1)]);
  });

  it('uses a v-model range and shows its months', async () => {
    const wrapper = mountPicker({
      dateRange: [day(2, 5), day(3, 3)],
      rangeType: 'custom',
    });
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(2, 5));
    expect(button(wrapper).props('selectedEndDate')).toEqual(endOf(3, 3));
    await open(wrapper);
    expect(months(wrapper)).toEqual([startOf(2, 1), startOf(3, 1)]);
    expect(inputs(wrapper)[0].props('isDisabled')).toBe(false);
  });

  it('keeps last-7-day dates when mounted with only a range type (FINDINGS)', () => {
    // The immediate watcher sees the range already selected, so the dates
    // are never recomputed for the initial range type.
    const wrapper = mountPicker({ rangeType: 'last30days' });
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(4, 9));
    expect(button(wrapper).props('selectedRange')).toBe('last30days');
  });

  it('recomputes the dates when the range type changes later', async () => {
    const wrapper = mountPicker({ rangeType: 'last30days' });
    await wrapper.setProps({ rangeType: 'last3months' });
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(1, 15));
    // A custom range keeps the current dates.
    await wrapper.setProps({ rangeType: 'custom' });
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(1, 15));
    // A new range type with dates uses the given dates.
    await wrapper.setProps({
      rangeType: 'last6months',
      dateRange: [day(0, 2), day(0, 4)],
    });
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(0, 2));
  });

  it('keeps the default dates for a custom range type without dates', () => {
    const wrapper = mountPicker({ rangeType: 'custom' });
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(4, 9));
  });

  it('ignores an incomplete v-model range', () => {
    const wrapper = mountPicker({ dateRange: [day(2, 5)] });
    expect(button(wrapper).props('selectedEndDate')).toEqual(endOf(4, 15));
  });
});

describe('DatePicker navigable ranges', () => {
  it('restores a past month from the URL and navigates forward to now', async () => {
    const wrapper = mountPicker({
      rangeType: 'monthToDate',
      dateRange: [day(2, 1), day(2, 31)],
    });
    expect(button(wrapper).props()).toMatchObject({
      showMonthNavigation: true,
      canNavigateNext: true,
      navigationLabel: 'March',
    });

    await button(wrapper).vm.$emit('navigateMonth', 'next');
    expect(wrapper.emitted('dateRangeChanged')[0]).toEqual([
      [startOf(3, 1), endOf(3, 30), 'monthToDate'],
    ]);
    await button(wrapper).vm.$emit('navigateMonth', 'next');
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(4, 1));
    // Past the current month the offset is clamped at zero.
    await button(wrapper).vm.$emit('navigateMonth', 'next');
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(4, 1));
    expect(button(wrapper).props('canNavigateNext')).toBe(false);
  });

  it('ignores new v-model dates while navigating with the arrows', async () => {
    const wrapper = mountPicker({ rangeType: 'monthToDate' });
    await button(wrapper).vm.$emit('navigateMonth', 'prev');
    await wrapper.setProps({ dateRange: [day(0, 1), day(0, 31)] });
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(3, 1));
  });

  it('labels past weeks with their number and hides the label this week', async () => {
    const past = mountPicker({
      rangeType: 'thisWeek',
      dateRange: [day(4, 6), day(4, 12)],
    });
    expect(past.findComponent(DatePickerButton).props('navigationLabel')).toBe(
      'DATE_PICKER.WEEK_NUMBER:{"weekNumber":19}'
    );
    const current = mountPicker({
      rangeType: 'thisWeek',
      dateRange: [day(4, 13), day(4, 15)],
    });
    expect(button(current).props('navigationLabel')).toBe(null);
    await button(current).vm.$emit('navigateMonth', 'prev');
    expect(button(current).props('selectedStartDate')).toEqual(startOf(4, 6));
    // Same-month week: the right calendar shows the next month.
    await open(current);
    expect(months(current)).toEqual([startOf(4, 1), startOf(5, 1)]);
    // A week across two months shows both months.
    await button(current).vm.$emit('navigateMonth', 'prev');
    expect(button(current).props('selectedStartDate')).toEqual(startOf(3, 29));
    expect(months(current)).toEqual([startOf(3, 1), startOf(4, 1)]);
  });

  it('resets the offset when the range type changes', async () => {
    const wrapper = mountPicker({ rangeType: 'monthToDate' });
    await button(wrapper).vm.$emit('navigateMonth', 'prev');
    await wrapper.setProps({ rangeType: 'last7days' });
    expect(button(wrapper).props('selectedStartDate')).toEqual(startOf(4, 9));
    expect(button(wrapper).props('showMonthNavigation')).toBe(false);
  });

  it('has no navigation label for other ranges', () => {
    const wrapper = mountPicker({ rangeType: 'lastYear' });
    expect(button(wrapper).props('navigationLabel')).toBe(null);
  });
});

describe('DatePicker calendar interactions', () => {
  it('applies preset ranges and positions the calendars', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    const presets = wrapper.findComponent(CalendarDateRange);
    await presets.vm.$emit('setRange', { value: 'last30days' });
    expect(months(wrapper)).toEqual([startOf(3, 1), startOf(4, 1)]);
    await presets.vm.$emit('setRange', { value: 'monthToDate' });
    expect(months(wrapper)).toEqual([startOf(4, 1), startOf(5, 1)]);
    expect(presets.props('selectedRange')).toBe('monthToDate');
    expect(inputs(wrapper)[1].props('isDisabled')).toBe(true);
  });

  it('moves each calendar without letting them overlap', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    const [start, end] = weeks(wrapper);
    // May / June: moving start forward would collide, so end moves on.
    await start.vm.$emit('next');
    expect(months(wrapper)).toEqual([startOf(5, 1), startOf(6, 1)]);
    // Moving end back onto start pushes start back instead.
    await end.vm.$emit('prev');
    expect(months(wrapper)).toEqual([startOf(4, 1), startOf(5, 1)]);
    await end.vm.$emit('next');
    expect(months(wrapper)).toEqual([startOf(4, 1), startOf(6, 1)]);
    await start.vm.$emit('prev');
    expect(months(wrapper)).toEqual([startOf(3, 1), startOf(6, 1)]);
    await end.vm.$emit('prev');
    await end.vm.$emit('prev');
    expect(months(wrapper)).toEqual([startOf(3, 1), startOf(4, 1)]);
    await end.vm.$emit('prev');
    expect(months(wrapper)).toEqual([startOf(2, 1), startOf(3, 1)]);
  });

  it('selects a custom range in two clicks and restarts on an earlier day', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    const [start] = weeks(wrapper);
    await start.vm.$emit('selectDate', day(4, 10));
    expect(start.props()).toMatchObject({
      selectedStartDate: day(4, 10),
      selectedEndDate: null,
      selectingEndDate: true,
    });
    expect(inputs(wrapper)[1].props('dateValue')).toBe(null);
    await start.vm.$emit('selectDate', day(4, 2));
    expect(start.props('selectedStartDate')).toEqual(day(4, 2));
    await start.vm.$emit('selectDate', day(4, 12));
    expect(start.props()).toMatchObject({
      selectedEndDate: day(4, 12),
      selectingEndDate: false,
    });
    expect(button(wrapper).props('selectedRange')).toBe('custom');
  });

  it('tracks the hovered end date', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    await weeks(wrapper)[0].vm.$emit('updateHoveredEndDate', day(4, 20));
    expect(weeks(wrapper)[1].props('hoveredEndDate')).toEqual(day(4, 20));
  });

  it('switches between week, month and year views', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    await weeks(wrapper)[0].vm.$emit('setView', 'start', 'month');
    const month = wrapper.findComponent(CalendarMonth);
    expect(month.props('calendarType')).toBe('start');
    // Month view arrows move a whole year.
    await month.vm.$emit('next');
    expect(month.props('startCurrentDate')).toEqual(new Date(2025, 4, 1));
    await month.vm.$emit('prev');
    expect(month.props('startCurrentDate')).toEqual(startOf(4, 1));

    await month.vm.$emit('setView', 'start', 'year');
    const year = wrapper.findComponent(CalendarYear);
    await year.vm.$emit('selectYear', 2022);
    expect(
      wrapper.findComponent(CalendarMonth).props('startCurrentDate')
    ).toEqual(new Date(2022, 4, 1));
    await wrapper.findComponent(CalendarMonth).vm.$emit('selectMonth', 1);
    expect(weeks(wrapper)).toHaveLength(2);
    expect(months(wrapper)[0]).toEqual(new Date(2022, 1, 1));
  });

  it('opens month and year pickers on the end calendar', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    await weeks(wrapper)[1].vm.$emit('setView', 'end', 'year');
    await wrapper.findComponent(CalendarYear).vm.$emit('selectYear', 2025);
    const month = wrapper.findComponent(CalendarMonth);
    expect(month.props('endCurrentDate')).toEqual(new Date(2025, 5, 1));
    await month.vm.$emit('selectMonth', 8);
    expect(months(wrapper)[1]).toEqual(new Date(2025, 8, 1));
  });

  it('accepts typed dates for either calendar and alerts on errors', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    const [startInput, endInput] = inputs(wrapper);
    expect(startInput.props('compareDate')).toEqual(endOf(4, 15));
    expect(endInput.props('compareDate')).toEqual(startOf(4, 9));

    await startInput.vm.$emit('update', day(1, 2));
    expect(startInput.props('dateValue')).toEqual(day(1, 2));
    await endInput.vm.$emit('update', day(1, 9));
    expect(endInput.props('dateValue')).toEqual(day(1, 9));

    await startInput.vm.$emit('validate', day(1, 2));
    await endInput.vm.$emit('validate', day(2, 9));
    expect(months(wrapper)).toEqual([startOf(1, 1), startOf(2, 1)]);
    expect(button(wrapper).props('selectedEndDate')).toEqual(day(2, 9));

    await startInput.vm.$emit('error', 'Bad date');
    expect(useAlert).toHaveBeenCalledWith('Bad date');
  });

  it('keeps the previous date in the inputs for an invalid date', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    const [startInput] = inputs(wrapper);
    await startInput.vm.$emit('validate', new Date('nope'));
    expect(startInput.props('dateValue').getTime()).toBeNaN();
  });
});

describe('DatePicker footer and closing', () => {
  it('applies the selected range', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    await wrapper.findComponent(CalendarFooter).vm.$emit('change');
    expect(wrapper.emitted('dateRangeChanged')[0]).toEqual([
      [startOf(4, 9), endOf(4, 15), 'last7days'],
    ]);
    expect(wrapper.findComponent(CalendarFooter).exists()).toBe(false);
  });

  it('refuses to apply a half-selected range', async () => {
    const wrapper = mountPicker({ hasAppliedRange: false });
    await weeks(wrapper)[0].vm.$emit('selectDate', day(4, 10));
    await wrapper.findComponent(CalendarFooter).vm.$emit('change');
    expect(useAlert).toHaveBeenCalledWith('Please select a valid time range');
    expect(wrapper.emitted('dateRangeChanged')).toBeUndefined();
  });

  it('resets to the last seven days', async () => {
    const wrapper = mountPicker({
      hasAppliedRange: false,
      rangeType: 'last3months',
    });
    await weeks(wrapper)[0].vm.$emit('setView', 'start', 'month');
    await wrapper.findComponent(CalendarFooter).vm.$emit('clear');
    expect(button(wrapper).props()).toMatchObject({
      selectedStartDate: startOf(4, 9),
      selectedEndDate: endOf(4, 15),
      selectedRange: 'last7days',
    });
    expect(weeks(wrapper)).toHaveLength(2);
    expect(months(wrapper)).toEqual([startOf(4, 1), startOf(5, 1)]);
  });

  it('positions the calendars for ranges that span two months', async () => {
    vi.setSystemTime(day(4, 3, 9));
    const wrapper = mountPicker({ hasAppliedRange: false });
    expect(months(wrapper)).toEqual([startOf(3, 1), startOf(4, 1)]);
    await wrapper.findComponent(CalendarFooter).vm.$emit('clear');
    expect(months(wrapper)).toEqual([startOf(3, 1), startOf(4, 1)]);
  });

  it('toggles open, repositions and emits close', async () => {
    const wrapper = mountPicker({ dateRange: [day(2, 5), day(2, 9)] });
    await open(wrapper);
    expect(months(wrapper)).toEqual([startOf(2, 1), startOf(3, 1)]);
    await open(wrapper);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('skips repositioning while only a start date is chosen', async () => {
    const wrapper = mountPicker();
    await open(wrapper);
    await weeks(wrapper)[0].vm.$emit('next');
    await weeks(wrapper)[0].vm.$emit('selectDate', day(6, 3));
    await open(wrapper);
    await open(wrapper);
    expect(months(wrapper)).toEqual([startOf(5, 1), startOf(6, 1)]);
  });

  it('applies on click-away when a valid range was applied before', async () => {
    const wrapper = mountPicker();
    await open(wrapper);
    env.clickaway();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('dateRangeChanged')).toHaveLength(1);
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('just closes on click-away for a first or incomplete selection', async () => {
    const first = mountPicker({ hasAppliedRange: false });
    env.clickaway();
    await first.vm.$nextTick();
    expect(first.emitted('close')).toHaveLength(1);
    expect(first.emitted('dateRangeChanged')).toBeUndefined();

    const partial = mountPicker();
    await open(partial);
    await weeks(partial)[0].vm.$emit('selectDate', day(4, 10));
    env.clickaway();
    expect(partial.emitted('close')).toHaveLength(1);
  });
});
