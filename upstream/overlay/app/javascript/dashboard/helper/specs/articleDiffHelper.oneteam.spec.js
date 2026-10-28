import {
  buildDiffBlocks,
  renderInlineDiff,
  rendersIdentically,
} from '../articleDiffHelper';

describe('articleDiffHelper (OneTeam)', () => {
  it('treats missing text as empty', () => {
    expect(rendersIdentically(null, undefined)).toBe(true);
    expect(rendersIdentically(null, 'x')).toBe(false);
    expect(buildDiffBlocks(null, undefined)).toEqual([]);
  });

  it('shows huge texts as fully removed and added', () => {
    const oldText = Array.from({ length: 2001 }, (_, i) => `o${i}`).join(' ');
    const html = renderInlineDiff(oldText, 'new');
    // Adjacent removals merge into one struck-through span.
    expect(html.match(/line-through/g)).toHaveLength(1);
    expect(html).toContain('o0 ');
    expect(html).toContain('o2000');
    expect(html).toContain('new');
  });

  it('skips runs of blank lines between blocks', () => {
    expect(buildDiffBlocks('', 'One\n\n\n\nTwo')).toEqual([
      { type: 'added', md: 'One' },
      { type: 'added', md: 'Two' },
    ]);
  });
});
