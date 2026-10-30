import { reactive, ref, nextTick } from 'vue';
import { useMacroHotKeys } from '../useMacroHotKeys';

/*
 * OneTeam coverage for the command bar's "Execute a macro" entries. Macros
 * are offered only on conversation routes when the macros feature is on;
 * running one keeps any required attributes it is waiting for.
 */
const ctx = vi.hoisted(() => ({
  route: null,
  macros: null,
  flagOn: true,
  dispatch: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('vue-router', () => ({ useRoute: () => ctx.route }));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: ctx.dispatch }),
  useMapGetter: () => ({ value: { id: 42 } }),
}));
vi.mock('dashboard/composables/useMacroExecution', () => ({
  useMacroExecution: () => ({
    execute: ctx.execute,
    submitPendingAttributes: vi.fn(),
    dismissPendingAttributes: vi.fn(),
  }),
}));
vi.mock('dashboard/composables/useOrderedMacros', () => ({
  useOrderedMacros: () => ({ orderedMacros: ctx.macros }),
}));
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ isFeatureFlagEnabled: () => ctx.flagOn }),
}));

describe('useMacroHotKeys (OneTeam)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ctx.flagOn = true;
    ctx.route = reactive({ name: 'inbox_conversation' });
    ctx.macros = ref([]);
  });

  it('loads macros on a conversation route when none are loaded', async () => {
    const { macroHotKeys } = useMacroHotKeys();
    expect(ctx.dispatch).toHaveBeenCalledWith('macros/get');
    expect(macroHotKeys.value).toEqual([]);

    ctx.route.name = 'inbox_view_conversation';
    ctx.macros.value = [{ id: 1, name: 'Close' }];
    await nextTick();
    expect(ctx.dispatch).toHaveBeenCalledTimes(1);
  });

  it('offers one entry per macro and runs it on the open conversation', () => {
    ctx.macros.value = [{ id: 1, name: 'Close' }];
    ctx.execute.mockReturnValue({ pending: true });
    const { macroHotKeys, pendingAttributes } = useMacroHotKeys();
    expect(ctx.dispatch).not.toHaveBeenCalled();
    const [parent, child] = macroHotKeys.value;
    expect(parent.children).toEqual(['macro-1']);
    child.handler();
    expect(ctx.execute).toHaveBeenCalledWith(ctx.macros.value[0], 42);
    expect(pendingAttributes.value).toEqual({ pending: true });
  });

  it('offers nothing off conversation routes or with macros turned off', () => {
    ctx.macros.value = [{ id: 1, name: 'Close' }];
    ctx.route.name = 'settings_home';
    expect(useMacroHotKeys().macroHotKeys.value).toEqual([]);
    ctx.route.name = 'inbox_conversation';
    ctx.flagOn = false;
    expect(useMacroHotKeys().macroHotKeys.value).toEqual([]);
    expect(ctx.dispatch).not.toHaveBeenCalled();
  });
});
