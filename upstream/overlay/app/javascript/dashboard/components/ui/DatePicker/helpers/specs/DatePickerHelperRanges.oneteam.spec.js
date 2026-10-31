/**
 * OneTeam spec for the date picker range helpers the upstream spec leaves
 * out: reversed ranges, hover states, the week and month-to-date presets,
 * and stepping a navigable range back and forth.
 */
import {
  dayIsInRange,
  isHoveringNextDayInRange,
  getActiveDateRange,
  isNavigableRange,
  getRangeAtOffset,
} from '../DatePickerHelper';

// Wednesday 15 January 2025, mid-afternoon.
const today = new Date(2025, 0, 15, 15, 30);
const day = (month, date) => new Date(2025, month, date);

describe('dayIsInRange', () => {
  it('accepts a range picked end first', () => {
    expect(dayIsInRange(day(0, 10), day(0, 12), day(0, 8))).toBe(true);
    expect(dayIsInRange(day(0, 20), day(0, 12), day(0, 8))).toBe(false);
  });
});

describe('isHoveringNextDayInRange', () => {
  it('is false without a start date', () => {
    expect(isHoveringNextDayInRange(day(0, 10), null, null, day(0, 12))).toBe(
      false
    );
  });
});

describe('getActiveDateRange', () => {
  it('starts this week on Monday and month to date on the 1st', () => {
    expect(getActiveDateRange('thisWeek', today)).toEqual({
      start: day(0, 13),
      end: new Date(2025, 0, 15, 23, 59, 59, 999),
    });
    expect(getActiveDateRange('monthToDate', today).start).toEqual(day(0, 1));
  });
});

describe('navigable ranges', () => {
  it('only steps this week and month to date', () => {
    expect(isNavigableRange('thisWeek')).toBe(true);
    expect(isNavigableRange('monthToDate')).toBe(true);
    expect(isNavigableRange('last7days')).toBe(false);
  });

  it('steps whole weeks, ending the current one today', () => {
    expect(getRangeAtOffset('thisWeek', 0, today)).toEqual({
      start: day(0, 13),
      end: new Date(2025, 0, 15, 23, 59, 59, 999),
    });
    expect(getRangeAtOffset('thisWeek', -1, today)).toEqual({
      start: day(0, 6),
      end: new Date(2025, 0, 12, 23, 59, 59, 999),
    });
  });

  it('steps whole months, ending the current one today', () => {
    expect(getRangeAtOffset('monthToDate', 0, today)).toEqual({
      start: day(0, 1),
      end: new Date(2025, 0, 15, 23, 59, 59, 999),
    });
    expect(getRangeAtOffset('monthToDate', -1, today)).toEqual({
      start: new Date(2024, 11, 1),
      end: new Date(2024, 11, 31, 23, 59, 59, 999),
    });
  });

  it('defaults to today', () => {
    expect(getRangeAtOffset('monthToDate', 0).start.getDate()).toBe(1);
  });
});
