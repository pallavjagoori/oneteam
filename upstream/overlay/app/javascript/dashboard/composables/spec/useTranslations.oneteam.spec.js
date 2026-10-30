import { ref } from 'vue';
import { useTranslations, selectTranslation } from '../useTranslations';

/*
 * OneTeam coverage for choosing which stored translation of a message to
 * show. Without auto-translate the agent's UI locale wins, then the account
 * locale, then the first translation. With auto-translate on, the target
 * locale is used, and contact-side messages show nothing if it is missing.
 */
const ctx = vi.hoisted(() => ({
  uiSettings: {},
  account: {},
  autoTranslate: { enabled: false },
}));

vi.mock('../useUISettings', () => ({
  useUISettings: () => ({ uiSettings: { value: ctx.uiSettings } }),
}));
vi.mock('../useAccount', () => ({
  useAccount: () => ({ currentAccount: { value: ctx.account } }),
}));
vi.mock('../store', () => ({
  useMapGetter: () => ({
    get value() {
      return ctx.autoTranslate;
    },
  }),
}));

const translations = { fr: 'Bonjour', de: 'Hallo' };

describe('useTranslations (OneTeam)', () => {
  beforeEach(() => {
    ctx.uiSettings = {};
    ctx.account = {};
    ctx.autoTranslate = { enabled: false };
  });

  it('selects by agent locale, then account locale, then the first one', () => {
    expect(selectTranslation(null)).toBeNull();
    expect(selectTranslation({}, 'fr')).toBeNull();
    expect(selectTranslation(translations, 'de', 'fr')).toBe('Hallo');
    expect(selectTranslation(translations, 'es', 'fr')).toBe('Bonjour');
    expect(selectTranslation(translations)).toBe('Bonjour');
  });

  it('has nothing to show without translations', () => {
    expect(useTranslations(ref(null)).hasTranslations.value).toBe(false);
    expect(
      useTranslations(ref({ translations: {} })).translationContent.value
    ).toBeNull();
  });

  it('uses the UI and account locale when auto-translate is off', () => {
    ctx.uiSettings = { locale: 'de' };
    const { translationContent, hasTranslations } = useTranslations(
      ref({ translations })
    );
    expect(translationContent.value).toBe('Hallo');
    expect(hasTranslations.value).toBe(true);
    ctx.uiSettings = null;
    ctx.account = null;
    expect(
      useTranslations(ref({ translations })).translationContent.value
    ).toBe('Bonjour');
  });

  it('uses the auto-translate locale, with no fallback for contact messages', () => {
    ctx.autoTranslate = { enabled: true, locale: 'es' };
    expect(
      useTranslations(ref({ translations }), ref(true)).translationContent.value
    ).toBeNull();
    expect(
      useTranslations(ref({ translations }), false).translationContent.value
    ).toBe('Bonjour');
    ctx.autoTranslate = { enabled: true, locale: 'de' };
    expect(
      useTranslations(ref({ translations }), true).translationContent.value
    ).toBe('Hallo');
  });
});
