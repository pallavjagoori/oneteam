/**
 * Covers getDocumentDisplayPath fallbacks: an undecodable path is shown as
 * is, and a malformed URL falls back to formatDocumentLink.
 */
import { formatDocumentLink, getDocumentDisplayPath } from '../documentHelper';

describe('getDocumentDisplayPath fallbacks', () => {
  it('keeps a path that cannot be decoded', () => {
    expect(getDocumentDisplayPath('https://example.test/bad%E0%A4%A')).toBe(
      'bad%E0%A4%A'
    );
  });

  it('formats a malformed URL as a document link', () => {
    expect(getDocumentDisplayPath('not a url')).toBe(
      formatDocumentLink('not a url')
    );
  });
});
