/**
 * Covers useLocale's fallbacks: to the base language, and to English when
 * neither the locale nor its base language is supported by Intl.
 */
import { ref } from 'vue';
import { useLocale } from '../useLocale';

const locale = ref('xx_YY');
vi.mock('vue-i18n', () => ({ useI18n: () => ({ locale }) }));

describe('useLocale fallback', () => {
  it('falls back to the base language when only it is supported', () => {
    vi.spyOn(Intl.NumberFormat, 'supportedLocalesOf')
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['xx']);
    expect(useLocale().resolvedLocale.value).toBe('xx');
  });

  it('returns en when no form of the locale is supported', () => {
    vi.spyOn(Intl.NumberFormat, 'supportedLocalesOf').mockReturnValue([]);
    expect(useLocale().resolvedLocale.value).toBe('en');
  });
});
