/**
 * OneTeam behaviour spec for the typed date field in the date range
 * picker.
 *
 * Covers the start or end label, showing the date in the browser locale
 * with the locale's format as placeholder, emitting only valid typed
 * dates, and on Enter: rejecting an invalid date with the expected
 * format, rejecting a start after the end or an end before the start,
 * and otherwise confirming the date.
 */
import { mount } from '@vue/test-utils';
import CalendarDateInput from '../CalendarDateInput.vue';

vi.mock('../../helpers/DatePickerHelper', async importOriginal => ({
  ...(await importOriginal()),
  getIntlDateFormatForLocale: () => 'dd/MM/yyyy',
}));

const march4 = new Date(2026, 2, 4);
const march10 = new Date(2026, 2, 10);

const mountInput = props =>
  mount(CalendarDateInput, { props: { calendarType: 'start', ...props } });

const enter = wrapper => wrapper.find('input').trigger('keypress.enter');

describe('CalendarDateInput behaviour', () => {
  it('shows the date and emits valid typed dates', async () => {
    const wrapper = mountInput({ dateValue: march4, isDisabled: true });
    const input = wrapper.find('input');
    expect(wrapper.text()).toBe('DATE_PICKER.DATE_RANGE_INPUT.START');
    expect(input.element.value).toBe(
      march4.toLocaleDateString(navigator.language)
    );
    expect(input.attributes('placeholder')).toBe('DD/MM/YYYY');
    expect(input.attributes('disabled')).toBeDefined();

    const editable = mountInput({ dateValue: march4 });
    await editable.find('input').setValue('12/03/2026');
    expect(editable.emitted('update')[0][0]).toEqual(new Date(2026, 2, 12));
    await editable.find('input').setValue('not a date');
    expect(editable.emitted('update')).toHaveLength(1);

    const empty = mountInput({ calendarType: 'end' });
    expect(empty.text()).toBe('DATE_PICKER.DATE_RANGE_INPUT.END');
    expect(empty.find('input').element.value).toBe('');
  });

  it('rejects an invalid date on Enter', async () => {
    const wrapper = mountInput({ dateValue: new Date('nope') });
    await enter(wrapper);
    expect(wrapper.emitted('error')[0]).toEqual([
      'Please enter the date in valid format: DD/MM/YYYY',
    ]);
  });

  it('checks the range on Enter', async () => {
    const lateStart = mountInput({ dateValue: march10, compareDate: march4 });
    await enter(lateStart);
    expect(lateStart.emitted('error')[0]).toEqual([
      'Start date must be before the end date.',
    ]);

    const earlyEnd = mountInput({
      calendarType: 'end',
      dateValue: march4,
      compareDate: march10,
    });
    await enter(earlyEnd);
    expect(earlyEnd.emitted('error')[0]).toEqual([
      'End date must be after the start date.',
    ]);

    const start = mountInput({ dateValue: march4, compareDate: march10 });
    await enter(start);
    expect(start.emitted('validate')[0]).toEqual([march4]);

    const end = mountInput({
      calendarType: 'end',
      dateValue: march10,
      compareDate: march4,
    });
    await enter(end);
    expect(end.emitted('validate')[0]).toEqual([march10]);

    const alone = mountInput({ calendarType: 'other', dateValue: march4 });
    await enter(alone);
    expect(alone.emitted('validate')[0]).toEqual([march4]);
  });
});
