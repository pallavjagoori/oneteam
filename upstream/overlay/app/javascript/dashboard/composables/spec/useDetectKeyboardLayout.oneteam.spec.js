import { LAYOUT_QWERTY, LAYOUT_AZERTY } from 'shared/helpers/KeyboardHelpers';
import { useDetectKeyboardLayout } from '../useDetectKeyboardLayout';

/*
 * OneTeam coverage for the legacy keyboard layout check (used when the
 * browser has no navigator.keyboard). The probe types "y"; the layout is
 * read from the key the browser reports, which a stubbed KeyboardEvent
 * sets here.
 */
const reportKey = key => {
  vi.stubGlobal(
    'KeyboardEvent',
    class extends Event {
      constructor(type, init) {
        super(type, init);
        this.key = key;
      }
    }
  );
};

describe('useDetectKeyboardLayout legacy probe (OneTeam)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.cw_keyboard_layout;
  });

  it.each([
    ['z', LAYOUT_QWERTY],
    ['q', LAYOUT_AZERTY],
  ])('reads key %s as %s', async (key, layout) => {
    reportKey(key);
    await expect(useDetectKeyboardLayout()).resolves.toBe(layout);
  });
});
