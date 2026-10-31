/* eslint-disable vue/one-component-per-file */
/**
 * OneTeam spec for the sidebar provider: resize state, the shared popover
 * state, and the context that resolves a link's route, permissions, feature
 * flag and installation type.
 */
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import {
  useSidebarResize,
  usePopoverState,
  useSidebarContext,
  provideSidebarContext,
} from '../provider';

const uiSettings = ref({});
const updateUISettings = vi.fn();
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings, updateUISettings }),
}));

const shouldShow = vi.fn(() => true);
vi.mock('dashboard/composables/usePolicy', () => ({
  usePolicy: () => ({ shouldShow }),
}));

const routes = [
  {
    name: 'inbox_view',
    path: '/inbox',
    meta: {
      permissions: ['agent'],
      featureFlag: 'inbox_view',
      installationTypes: ['cloud'],
    },
  },
  { name: 'bare', path: '/bare', meta: {} },
];
const router = {
  resolve: vi.fn(to => {
    const route = routes.find(r => r.name === to.name || r.path === to);
    return route ? { path: route.path, meta: route.meta } : undefined;
  }),
  getRoutes: () => routes,
};
vi.mock('vue-router', () => ({ useRouter: () => router }));

// Runs a composable inside a component, optionally under a provided context.
const withSetup = (composable, context) => {
  let result;
  const Child = defineComponent({
    setup() {
      result = composable();
      return () => null;
    },
  });
  mount(
    defineComponent({
      setup() {
        if (context) provideSidebarContext(context);
        return () => h(Child);
      },
    })
  );
  return result;
};

describe('useSidebarResize', () => {
  beforeEach(() => {
    uiSettings.value = {};
  });

  it('starts at the saved width, or 200, and collapses below 160', () => {
    const resize = withSetup(useSidebarResize);
    expect(resize.sidebarWidth.value).toBe(200);
    expect(resize.isCollapsed.value).toBe(false);
    uiSettings.value = { sidebar_width: 100 };
    expect(withSetup(useSidebarResize).isCollapsed.value).toBe(true);
    expect(resize).toMatchObject({
      MIN_WIDTH: 56,
      MAX_WIDTH: 320,
      COLLAPSED_THRESHOLD: 160,
      DEFAULT_WIDTH: 200,
    });
  });

  it('clamps the width and saves it', () => {
    const resize = withSetup(useSidebarResize);
    resize.setSidebarWidth(10);
    expect(resize.sidebarWidth.value).toBe(56);
    resize.setSidebarWidth(999);
    expect(resize.sidebarWidth.value).toBe(320);
    resize.setSidebarWidth(250);
    resize.saveWidth();
    expect(updateUISettings).toHaveBeenCalledWith({ sidebar_width: 250 });
  });

  it('snaps to collapsed and to expanded', () => {
    const resize = withSetup(useSidebarResize);
    resize.snapToCollapsed();
    expect(resize.sidebarWidth.value).toBe(56);
    expect(updateUISettings).toHaveBeenCalledWith({ sidebar_width: 56 });
    resize.snapToExpanded();
    expect(resize.sidebarWidth.value).toBe(200);
    expect(updateUISettings).toHaveBeenCalledWith({ sidebar_width: 200 });
  });
});

describe('usePopoverState', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shares one open popover between every caller', () => {
    const first = usePopoverState();
    const second = usePopoverState();
    first.setActivePopover('teams');
    expect(second.activePopover.value).toBe('teams');
    second.closeActivePopover();
    expect(first.activePopover.value).toBeNull();
  });

  it('closes after a delay unless the close is cancelled', () => {
    const popover = usePopoverState();
    popover.setActivePopover('inboxes');
    popover.scheduleClose();
    popover.cancelClose();
    vi.advanceTimersByTime(200);
    expect(popover.activePopover.value).toBe('inboxes');
    popover.scheduleClose(50);
    vi.advanceTimersByTime(50);
    expect(popover.activePopover.value).toBeNull();
  });

  it('keeps a popover opened while a close was pending', () => {
    const popover = usePopoverState();
    popover.scheduleClose(100);
    popover.setActivePopover('labels');
    vi.advanceTimersByTime(100);
    expect(popover.activePopover.value).toBe('labels');
  });
});

describe('useSidebarContext', () => {
  const parent = { isCollapsed: ref(false), expandedItem: ref(null) };

  it('throws outside a <Sidebar />', () => {
    expect(() => withSetup(useSidebarContext)).toThrow(
      'Component is missing a parent <Sidebar /> component.'
    );
  });

  it('passes the parent context through', () => {
    const context = withSetup(useSidebarContext, parent);
    expect(context.isCollapsed).toBe(parent.isCollapsed);
  });

  it('resolves paths, falling back to /', () => {
    const { resolvePath } = withSetup(useSidebarContext, parent);
    expect(resolvePath({ name: 'inbox_view' })).toBe('/inbox');
    expect(resolvePath({ name: 'unknown' })).toBe('/');
    expect(resolvePath(null)).toBe('/');
  });

  it('reads permissions and feature flags from the target route', () => {
    const { resolvePermissions, resolveFeatureFlag } = withSetup(
      useSidebarContext,
      parent
    );
    expect(resolvePermissions({ name: 'inbox_view' })).toEqual(['agent']);
    expect(resolvePermissions({ name: 'bare' })).toEqual([]);
    expect(resolvePermissions({ name: 'unknown' })).toEqual([]);
    expect(resolvePermissions(null)).toEqual([]);
    expect(resolveFeatureFlag({ name: 'inbox_view' })).toBe('inbox_view');
    expect(resolveFeatureFlag({ name: 'bare' })).toBe('');
    expect(resolveFeatureFlag(null)).toBe('');
  });

  it('follows navigationPath to the real route definition', () => {
    const { resolvePermissions, resolveFeatureFlag, isAllowed } = withSetup(
      useSidebarContext,
      parent
    );
    const viaNavigation = name => ({
      name: 'navigation',
      params: { navigationPath: name },
    });
    expect(resolvePermissions(viaNavigation('inbox_view'))).toEqual(['agent']);
    expect(resolvePermissions(viaNavigation('missing'))).toEqual([]);
    expect(resolveFeatureFlag(viaNavigation('inbox_view'))).toBe('inbox_view');
    expect(resolveFeatureFlag(viaNavigation('missing'))).toBe('');
    isAllowed(viaNavigation('inbox_view'));
    expect(shouldShow).toHaveBeenLastCalledWith(
      'inbox_view',
      ['agent'],
      ['cloud']
    );
    isAllowed(viaNavigation('missing'));
    expect(shouldShow).toHaveBeenLastCalledWith('', [], []);
  });

  it('asks the policy whether a link is allowed', () => {
    const { isAllowed } = withSetup(useSidebarContext, parent);
    shouldShow.mockReturnValueOnce(false);
    expect(isAllowed({ name: 'inbox_view' })).toBe(false);
    expect(shouldShow).toHaveBeenLastCalledWith(
      'inbox_view',
      ['agent'],
      ['cloud']
    );
    isAllowed({ name: 'bare' });
    expect(shouldShow).toHaveBeenLastCalledWith('', [], []);
    isAllowed(null);
    expect(shouldShow).toHaveBeenLastCalledWith('', [], []);
  });
});
