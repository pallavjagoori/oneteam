/**
 * OneTeam spec for the SDK's dark mode setting: unknown values fall back to
 * light.
 */
import { getDarkMode } from '../settingsHelper';

describe('getDarkMode', () => {
  it('keeps supported modes and falls back to light', () => {
    expect(getDarkMode('auto')).toBe('auto');
    expect(getDarkMode('dark')).toBe('dark');
    expect(getDarkMode('purple')).toBe('light');
  });
});
