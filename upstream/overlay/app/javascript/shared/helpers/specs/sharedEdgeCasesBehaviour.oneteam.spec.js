/**
 * Edge-case coverage for small shared helpers and stores: time comparison,
 * domain validation, the mention markdown-it rule, global config getters and
 * the content-type constants.
 */
import MarkdownIt from 'markdown-it';
import { isTimeAfter } from '../DateHelper';
import { isDomain } from '../Validators';
import mentionPlugin from '../markdownIt/link';
import { getters } from '../../store/globalConfig';
import { CONTENT_TYPES } from '../../constants/contentType';

describe('isTimeAfter', () => {
  it('is true when the first hour is later', () => {
    expect(isTimeAfter(10, 0, 9, 30)).toBe(true);
  });
});

describe('isDomain', () => {
  it('accepts an empty value', () => {
    expect(isDomain('')).toBe(true);
  });
});

describe('mention markdown rule', () => {
  const md = new MarkdownIt().use(mentionPlugin);

  it('leaves an unclosed label as text', () => {
    expect(md.renderInline('[unclosed')).toBe('[unclosed');
  });

  it('ignores a link whose destination fails to parse', () => {
    expect(md.renderInline('[x](<bad')).toBe('[x](&lt;bad');
  });

  it('runs in silent mode for a mention nested inside a link label', () => {
    const html = md.renderInline(
      '[[@Ann](mention://user/1/Ann)](https://example.test)'
    );
    expect(html).toContain('prosemirror-mention-node');
  });
});

describe('globalConfig getters', () => {
  it('disables Meta message sending only on cloud', () => {
    const cloud = { deploymentEnv: 'cloud', disableMetaMessageSending: true };
    expect(getters.isMetaMessageSendingDisabled(cloud)).toBe(true);
    expect(
      getters.isMetaMessageSendingDisabled({ deploymentEnv: 'self' })
    ).toBe(false);
  });
});

describe('CONTENT_TYPES', () => {
  it('names the incoming email type', () => {
    expect(CONTENT_TYPES.INCOMING_EMAIL).toBe('incoming_email');
  });
});
