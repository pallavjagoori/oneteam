import { generateDateSuggestions } from '../localization';

const NOW = new Date('2026-03-04T10:00:00Z');
const de = {
  NEXT_YEAR: 'nächstes jahr',
  UNITS: { YEAR: 'jahr' },
  TIME_OF_DAY: { MORNING: 'morgens' },
};
const suggest = text =>
  generateDateSuggestions(text, NOW, { translations: de, locale: 'de' }).map(
    ({ query, label, date }) => [query, label, date.toISOString()]
  );

describe('generateDateSuggestions with translations (OneTeam)', () => {
  it('ignores input that is not text or is only punctuation', () => {
    expect(generateDateSuggestions(42)).toEqual([]);
    expect(generateDateSuggestions('!!!')).toEqual([]);
  });

  it('moves "next year" after the month, before any time', () => {
    expect(suggest('15 januar nächstes jahr')).toEqual([
      [
        '15 january next year',
        '15 januar nächstes jahr',
        '2027-01-15T09:00:00.000Z',
      ],
    ]);
    expect(suggest('15 januar 10 nächstes jahr')).toEqual([
      [
        '15 january next year 10',
        '15 januar nächstes jahr 10',
        '2027-01-15T10:00:00.000Z',
      ],
    ]);
  });

  it('reads a bare "year" after a month as next year', () => {
    expect(suggest('15 januar jahr')[0][0]).toBe('15 january next year');
  });

  it('leaves dates without a year alone', () => {
    expect(suggest('15 januar')[0][0]).toBe('15 january');
  });

  it('turns "10 morning" into 10am', () => {
    expect(suggest('montag 10 morgens')).toEqual([
      ['monday 10am', 'montag 10am', '2026-03-09T10:00:00.000Z'],
    ]);
  });

  it('works with a locale but no translations', () => {
    expect(
      generateDateSuggestions('montag', NOW, { locale: 'de' })[0].query
    ).toBe('monday');
    expect(
      generateDateSuggestions('montag', NOW, {
        translations: 'x',
        locale: 'de',
      })[0].query
    ).toBe('monday');
  });

  it('keeps working after the translation cache fills up', () => {
    for (let i = 0; i < 22; i += 1) {
      generateDateSuggestions('montag', NOW, {
        translations: { HALF: `halb${i}` },
        locale: 'de',
      });
    }
    expect(suggest('montag')[0][0]).toBe('monday');
  });
});
