/**
 * OneTeam behaviour spec for date range checks with an open range.
 */
import { dayIsInRange } from '../DatePickerHelper';

describe('dayIsInRange with an open range', () => {
  it('is false until both ends are picked', () => {
    const day = new Date(2026, 0, 5);
    expect(dayIsInRange(day, null, day)).toBe(false);
    expect(dayIsInRange(day, day, undefined)).toBe(false);
  });
});
