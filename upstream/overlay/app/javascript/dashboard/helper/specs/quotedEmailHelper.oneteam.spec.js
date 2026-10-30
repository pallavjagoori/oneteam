import {
  buildQuotedEmailHeader,
  extractPlainTextFromHtml,
  extractQuotedEmailText,
  formatQuotedEmailDate,
  getEmailDate,
  getEmailSenderEmail,
  getInboxEmail,
} from '../quotedEmailHelper';

describe('quotedEmailHelper (OneTeam)', () => {
  describe('extractPlainTextFromHtml', () => {
    it('skips styles and comments', () => {
      expect(
        extractPlainTextFromHtml(
          '<p>a</p><style>p{color:red}</style><!-- c --><p>b</p>'
        )
      ).toBe('a\nb');
    });

    it('quotes blank lines inside blockquotes', () => {
      expect(
        extractPlainTextFromHtml('<blockquote>one<br><br>two</blockquote>')
      ).toBe('> one\n>\n> two');
    });

    it('separates table cells with spaces', () => {
      expect(
        extractPlainTextFromHtml('<table><tr><td>a</td><th>b</th></tr></table>')
      ).toBe('a b');
    });

    it('strips tags crudely when there is no DOM', () => {
      vi.stubGlobal('document', undefined);
      try {
        expect(extractPlainTextFromHtml('<p>a</p>')).toBe(' a ');
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  it('skips blank addresses', () => {
    const email = { content_attributes: { email: { from: [' '], to: [' '] } } };
    expect(getEmailSenderEmail(email, { email: 'c@example.com' })).toBe(
      'c@example.com'
    );
    expect(getInboxEmail(email, { email: 'i@example.com' })).toBe(
      'i@example.com'
    );
  });

  describe('getEmailDate', () => {
    it('falls back to the creation time when the email date is invalid', () => {
      expect(
        getEmailDate({
          content_attributes: { email: { date: 'not a date' } },
          created_at: 1_700_000_000,
        }).getTime()
      ).toBe(1_700_000_000_000);
    });

    it('accepts milliseconds and rejects unusable times', () => {
      expect(getEmailDate({ created_at: 1_700_000_000_000 }).getTime()).toBe(
        1_700_000_000_000
      );
      expect(getEmailDate({ created_at: 'yesterday' })).toBeNull();
      expect(getEmailDate({ created_at: 1e20 })).toBeNull();
    });
  });

  it('formats date strings through the fallback', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(formatQuotedEmailDate('2026-01-02T10:00:00Z')).toBe(
      'Fri, Jan 2, 2026 at 10:00 AM'
    );
  });

  it('builds the header for an outgoing email', () => {
    expect(
      buildQuotedEmailHeader(
        { message_type: 1, created_at: 1_700_000_000 },
        null,
        { email: 'support@example.com' }
      )
    ).toMatch(/^On .* <support@example.com> wrote:$/);
  });

  it('quotes the HTML reply when there is no full HTML', () => {
    expect(
      extractQuotedEmailText({
        content_attributes: { email: { html_content: { reply: '<p>Hi</p>' } } },
      })
    ).toBe('Hi');
  });
});
