/**
 * OneTeam spec for the message template list formatters: labels, dates and
 * status badge colours, with a dash for missing values.
 */
import {
  formatTemplateLabel,
  formatTemplateLanguage,
  templateTypeKey,
  formatTemplateDate,
  templateStatusClasses,
} from '../templateUtils';

describe('template formatters', () => {
  it('turns API enums into title case labels', () => {
    expect(formatTemplateLabel('ACCOUNT_UPDATE')).toBe('Account Update');
    expect(formatTemplateLabel('')).toBe('—');
  });

  it('formats dates, with a dash for none', () => {
    expect(formatTemplateDate('2026-01-15T10:00:00Z')).toMatch(/2026/);
    expect(formatTemplateDate(null)).toBe('—');
  });

  it('colours each status badge, grey for unknown ones', () => {
    expect(templateStatusClasses('APPROVED')).toBe(
      'bg-n-teal-3 text-n-teal-11'
    );
    expect(templateStatusClasses('rejected')).toBe(
      'bg-n-ruby-3 text-n-ruby-11'
    );
    expect(templateStatusClasses('in_appeal')).toBe(
      'bg-n-alpha-2 text-n-slate-11'
    );
    expect(templateStatusClasses(undefined)).toBe(
      'bg-n-alpha-2 text-n-slate-11'
    );
  });

  it('names a template language with its locale', () => {
    expect(formatTemplateLanguage('en_US')).toBe('English (en-US)');
    expect(formatTemplateLanguage('')).toBe('—');
  });

  it('keys a template by its detected type, per platform', () => {
    expect(
      templateTypeKey({
        components: [{ type: 'HEADER', format: 'IMAGE' }],
      })
    ).not.toBe('TEXT');
    expect(
      templateTypeKey({ platform: 'twilio', template_type: 'twilio/text' })
    ).toBe('TEXT');
  });
});
