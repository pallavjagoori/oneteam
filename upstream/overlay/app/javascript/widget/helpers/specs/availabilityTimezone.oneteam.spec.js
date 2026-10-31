/**
 * OneTeam spec for the timezone fallback in availabilityHelpers: an inbox
 * timezone the browser cannot use falls back to the visitor's own zone.
 */
import { utcToZonedTime } from 'date-fns-tz';
import { findNextAvailableSlotDetails } from '../availabilityHelpers';

vi.mock('date-fns-tz', () => ({ utcToZonedTime: vi.fn() }));

describe('findNextAvailableSlotDetails with an unusable timezone', () => {
  it('warns and uses the visitor timezone, accepting a string time', () => {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    utcToZonedTime.mockImplementation((value, zone) => {
      if (zone === 'Mars/Olympus') throw new RangeError('Invalid time zone');
      return new Date(value);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Monday 08:00 UTC; every day opens 09:00-17:00.
    const workingHours = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      dayOfWeek: day,
      openHour: 9,
      openMinutes: 0,
      closeHour: 17,
      closeMinutes: 0,
    }));
    const slot = findNextAvailableSlotDetails(
      '2024-01-15T08:00:00.000Z',
      'Mars/Olympus',
      workingHours
    );
    expect(warn).toHaveBeenCalledWith(
      `Invalid timezone: Mars/Olympus, falling back to user timezone: ${userTz}`
    );
    expect(utcToZonedTime).toHaveBeenCalledWith(
      '2024-01-15T08:00:00.000Z',
      userTz
    );
    expect(slot).not.toBeNull();
    expect(slot.daysUntilOpen).toBeGreaterThanOrEqual(0);
  });
});
