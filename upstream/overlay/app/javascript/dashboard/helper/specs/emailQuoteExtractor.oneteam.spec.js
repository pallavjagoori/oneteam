import { EmailQuoteExtractor } from '../emailQuoteExtractor';

describe('EmailQuoteExtractor (OneTeam)', () => {
  it('removes class-based quotes', () => {
    expect(
      EmailQuoteExtractor.extractQuotes(
        '<p>Reply</p><div class="gmail_quote">Old</div><span class="myQuote">x</span>'
      )
    ).toBe('<p>Reply</p>');
    expect(
      EmailQuoteExtractor.hasQuotes('<div class="OutlookQuote">x</div>')
    ).toBe(true);
  });

  it('removes the block around quote-like text once', () => {
    expect(
      EmailQuoteExtractor.extractQuotes(
        '<p>Reply</p><div><div>On Monday Jo wrote:<br>From: Jo</div></div>'
      )
    ).toBe('<p>Reply</p><div></div>');
  });

  // Chatwoot quirk worth keeping in mind when porting: text outside any block
  // finds the extractor's own wrapper <div> as its block. hasQuotes says yes,
  // but removing the detached wrapper does nothing, so the text stays.
  it('reports, but keeps, quote-like text that is not inside a block', () => {
    const html = '<span>On Monday Jo wrote:</span>';
    expect(EmailQuoteExtractor.extractQuotes(html)).toBe(html);
    expect(EmailQuoteExtractor.hasQuotes(html)).toBe(true);
  });

  it('detects text-based quotes', () => {
    expect(
      EmailQuoteExtractor.hasQuotes('<p>-----Original Message-----</p>')
    ).toBe(true);
    expect(EmailQuoteExtractor.hasQuotes('<p>Just a reply</p>')).toBe(false);
  });
});
