import { ref } from 'vue';
import { useFontSize } from '../useFontSize';
import { useMacroExecution } from '../useMacroExecution';

/*
 * OneTeam coverage for two fallbacks: the default font size when the
 * setting is cleared, and running a resolving macro on a conversation that
 * is not in the store (no custom attributes to check).
 */
const ctx = vi.hoisted(() => ({
  checkMissingAttributes: vi.fn(() => ({ hasMissing: false, missing: [] })),
  dispatch: vi.fn(() => Promise.resolve()),
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings: ref({}), updateUISettings: vi.fn() }),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: ctx.dispatch }),
  useMapGetter: () => ({ value: () => undefined }),
}));
vi.mock('dashboard/composables/useConversationRequiredAttributes', () => ({
  useConversationRequiredAttributes: () => ({
    checkMissingAttributes: ctx.checkMissingAttributes,
  }),
}));

describe('font size and macro fallbacks (OneTeam)', () => {
  it('applies the default font size when none is saved', () => {
    vi.stubGlobal('requestAnimationFrame', callback => callback());
    const { currentFontSize, applyFontSize } = useFontSize();
    applyFontSize(undefined);
    expect(document.documentElement.style.fontSize).toBe(currentFontSize.value);
    vi.unstubAllGlobals();
  });

  it('checks an unknown conversation against empty custom attributes', () => {
    useMacroExecution().execute(
      { id: 1, actions: [{ action_name: 'resolve_conversation' }] },
      99
    );
    expect(ctx.checkMissingAttributes).toHaveBeenCalledWith({});
  });
});
