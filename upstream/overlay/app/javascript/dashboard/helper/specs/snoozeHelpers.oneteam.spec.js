import {
  generateDateSuggestions,
  parseDateFromText,
} from 'dashboard/helper/snoozeDateParser';
import {
  findSnoozeTime,
  findStartOfNextMonth,
  generateSnoozeSuggestions,
  snoozedReopenTime,
} from '../snoozeHelpers';

// The parser is mocked so labels of any shape can reach the label formatter.
vi.mock('dashboard/helper/snoozeDateParser', () => ({
  generateDateSuggestions: vi.fn(() => []),
  parseDateFromText: vi.fn(),
}));

const NOW = new Date('2026-03-04T10:00:00Z');
const suggestion = (label, date = NOW) => ({
  date,
  unix: 111,
  query: label,
  label,
});

describe('snoozeHelpers (OneTeam)', () => {
  it('keeps a month that already starts on a Monday', () => {
    // 1 June 2026 is a Monday.
    expect(findStartOfNextMonth(new Date(2026, 4, 15)).getDate()).toBe(1);
  });

  it('returns null for an unknown snooze option', () => {
    expect(findSnoozeTime('someday', NOW)).toBeNull();
  });

  describe('snoozedReopenTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('formats today, this year and other years differently', () => {
      expect(snoozedReopenTime(null)).toBeNull();
      expect(snoozedReopenTime('2026-03-04T15:30:00Z')).toBe('3.30pm');
      expect(snoozedReopenTime('2027-01-02T09:00:00Z')).toBe(
        '2 Jan 2027, 9.00am'
      );
    });
  });

  describe('generateSnoozeSuggestions', () => {
    it('expands compact and unit labels', () => {
      generateDateSuggestions.mockReturnValue([
        suggestion('1h30m'),
        suggestion('2h1min'),
        suggestion('3 fortnights'),
        suggestion('1 hr'),
      ]);
      expect(
        generateSnoozeSuggestions('x', NOW).map(item => item.label)
      ).toEqual([
        '1 hour 30 minutes',
        '2 hours 1 minute',
        '3 fortnights',
        '1 hour',
      ]);
    });

    it('shows the year for dates in another year', () => {
      generateDateSuggestions.mockReturnValue([
        suggestion('next year', new Date('2027-03-04T10:00:00Z')),
      ]);
      const [item] = generateSnoozeSuggestions('x', NOW, { locale: 'en' });
      expect(item.formattedDate).toContain('2027');
    });

    it('falls back to date-fns formats for an invalid locale', () => {
      generateDateSuggestions.mockReturnValue([
        suggestion('soon'),
        suggestion('later', new Date('2027-03-04T10:00:00Z')),
      ]);
      const items = generateSnoozeSuggestions('x', NOW, {
        locale: 'not a locale!',
      });
      expect(items[0].formattedDate).toMatch(/^Wed, 4 Mar, \d+:00 [AP]M$/);
      expect(items[1].formattedDate).toMatch(/^Thu, 4 Mar 2027, /);
    });

    it('re-parses the query when resolved, else keeps the suggested time', () => {
      generateDateSuggestions.mockReturnValue([suggestion('soon')]);
      const [item] = generateSnoozeSuggestions('x');
      parseDateFromText.mockReturnValueOnce({ unix: 222 });
      expect(item.resolve()).toBe(222);
      parseDateFromText.mockReturnValueOnce(null);
      expect(item.resolve()).toBe(111);
    });
  });
});
