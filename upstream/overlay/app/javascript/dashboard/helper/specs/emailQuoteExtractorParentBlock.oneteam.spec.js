/**
 * OneTeam behaviour spec for finding the block that holds quoted text.
 */
import { EmailQuoteExtractor } from '../emailQuoteExtractor';

describe('EmailQuoteExtractor.findParentBlock', () => {
  it('finds the nearest block or nothing outside one', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span><b>On Monday wrote:</b></span>';
    const text = div.querySelector('b').firstChild;
    expect(EmailQuoteExtractor.findParentBlock(text)).toBe(div);
    const loose = document.createElement('span');
    loose.textContent = 'quote';
    expect(EmailQuoteExtractor.findParentBlock(loose.firstChild)).toBeNull();
  });
});
