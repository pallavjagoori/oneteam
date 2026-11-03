/**
 * OneTeam behaviour spec for tag input phone helpers.
 *
 * Covers the fallbacks when the phone library throws or cannot parse a
 * number.
 */
import { validatePhoneNumber, formatPhoneNumber } from '../tagInputHelper';

const env = vi.hoisted(() => ({ parse: () => undefined }));

vi.mock('libphonenumber-js', () => ({
  isValidPhoneNumber: () => {
    throw new Error('bad');
  },
  parsePhoneNumber: value => env.parse(value),
}));

describe('tagInputHelper phone fallbacks', () => {
  it('treats a number the library rejects as invalid', () => {
    expect(validatePhoneNumber('+1')).toBe(false);
  });

  it('keeps the typed value when nothing parses', () => {
    env.parse = () => undefined;
    expect(formatPhoneNumber('abc')).toEqual({
      isValid: false,
      formattedValue: 'abc',
    });
    env.parse = () => ({ isValid: () => false, formatInternational: () => '' });
    expect(formatPhoneNumber('12')).toEqual({
      isValid: false,
      formattedValue: '12',
    });
  });
});
