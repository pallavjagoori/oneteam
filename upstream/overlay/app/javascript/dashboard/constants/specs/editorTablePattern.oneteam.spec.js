/**
 * OneTeam spec for the editor's markdown table flattening.
 *
 * Covers turning a table into one `a | b` line per row (dropping the
 * separator row) at the top level and inside a quote, and leaving a
 * lone pipe line alone.
 */
import { MARKDOWN_PATTERNS } from '../editor';

/**
 * Applies the table patterns to a text.
 *
 * @param {string} text markdown text
 * @returns {string}
 */
const flatten = text =>
  MARKDOWN_PATTERNS.find(entry => entry.type === 'table').patterns.reduce(
    (result, { pattern, replacement }) => result.replace(pattern, replacement),
    text
  );

describe('editor table pattern', () => {
  it('flattens a table into rows', () => {
    expect(flatten('| a | b |\n| --- | :-: |\n| 1 | 2 \\| 3 |')).toBe(
      'a | b\n1 | 2 \\| 3'
    );
  });

  it('keeps the container prefix of quoted tables', () => {
    expect(flatten('> | a | b |\n> | --- | --- |\n> | 1 | 2 |')).toBe(
      '> a | b\n> 1 | 2'
    );
  });

  it('leaves a lone pipe line alone', () => {
    expect(flatten('| just text |')).toBe('| just text |');
  });
});
