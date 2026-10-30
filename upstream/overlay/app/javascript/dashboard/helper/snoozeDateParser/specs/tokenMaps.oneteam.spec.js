import {
  addFractionalSafe,
  inferHoursFromTOD,
  normalizeDigits,
  parseNumber,
  parseTimeString,
  stripNoise,
} from '../tokenMaps';

describe('snooze parser token helpers (OneTeam)', () => {
  it('leaves digits from unsupported scripts alone', () => {
    expect(normalizeDigits('๑ and ٣')).toBe('๑ and 3');
  });

  it('spells out compact hour and minute units', () => {
    expect(stripNoise('1h1m')).toBe('1 hour 1 minute');
    expect(stripNoise('2h5m')).toBe('2 hours 5 minutes');
    expect(stripNoise('1m')).toBe('1 minute');
    expect(stripNoise('5m')).toBe('5 minutes');
  });

  it('parses numbers, rejecting empty and unknown input', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('lots')).toBeNull();
    expect(parseNumber('three')).toBe(3);
  });

  it('rejects missing or malformed times', () => {
    expect(parseTimeString('')).toBeNull();
    expect(parseTimeString('noonish')).toBeNull();
  });

  describe('inferHoursFromTOD', () => {
    it('rejects impossible hours and minutes', () => {
      expect(inferHoursFromTOD('morning', 'x')).toBeNull();
      expect(inferHoursFromTOD('morning', '13')).toBeNull();
      expect(inferHoursFromTOD('morning', '5', '60')).toBeNull();
    });

    it('keeps the hour for labels without a range', () => {
      expect(inferHoursFromTOD('eod', '5', '30')).toEqual({
        hours: 5,
        minutes: 30,
      });
    });

    it('picks am or pm to fit the label', () => {
      expect(inferHoursFromTOD('morning', '6')).toEqual({
        hours: 6,
        minutes: 0,
      });
      expect(inferHoursFromTOD('evening', '6')).toEqual({
        hours: 18,
        minutes: 0,
      });
      expect(inferHoursFromTOD('noon', '12')).toEqual({
        hours: 12,
        minutes: 0,
      });
    });

    it('picks the closer reading when neither fits', () => {
      expect(inferHoursFromTOD('morning', '2')).toEqual({
        hours: 2,
        minutes: 0,
      });
      expect(inferHoursFromTOD('midnight', '12')).toEqual({
        hours: 12,
        minutes: 0,
      });
    });
  });

  describe('addFractionalSafe', () => {
    const start = new Date(2026, 0, 1, 0, 0);

    it('only allows halves', () => {
      expect(addFractionalSafe(start, 'hours', 1.3)).toBeNull();
    });

    it('rounds halves of units it cannot convert', () => {
      expect(addFractionalSafe(start, 'minutes', 1.5)).toEqual(
        new Date(2026, 0, 1, 0, 2)
      );
    });
  });
});
