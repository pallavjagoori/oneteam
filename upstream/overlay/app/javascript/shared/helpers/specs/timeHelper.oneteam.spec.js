/**
 * OneTeam specs for formatting call and recording durations.
 */
import { formatDuration } from '../timeHelper';

describe('formatDuration', () => {
  it('formats minutes and seconds, adding hours only when needed', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(75)).toBe('01:15');
    expect(formatDuration('3725')).toBe('01:02:05');
  });

  it('returns an empty string for missing, invalid or negative durations', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration('abc')).toBe('');
    expect(formatDuration(-5)).toBe('');
  });
});
