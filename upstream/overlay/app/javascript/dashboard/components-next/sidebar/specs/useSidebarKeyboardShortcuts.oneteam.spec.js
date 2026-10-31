/**
 * OneTeam spec for the sidebar keyboard shortcuts: open or close the
 * shortcut help, and jump to conversations, contacts, reports or settings.
 */
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { useSidebarKeyboardShortcuts } from '../useSidebarKeyboardShortcuts';

const route = { name: 'home' };
const router = { push: vi.fn() };
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));

describe('useSidebarKeyboardShortcuts', () => {
  let shortcuts;
  let toggleHelp;
  beforeEach(() => {
    toggleHelp = vi.fn();
    useSidebarKeyboardShortcuts(toggleHelp);
    [[shortcuts]] = useKeyboardEvents.mock.calls;
  });

  it('opens and closes the shortcut help', () => {
    shortcuts['$mod+Slash'].action();
    shortcuts['$mod+Escape'].action();
    expect(toggleHelp.mock.calls).toEqual([[true], [false]]);
  });

  it('navigates to each section unless already there', () => {
    shortcuts['Alt+KeyC'].action();
    expect(router.push).not.toHaveBeenCalled();
    shortcuts['Alt+KeyV'].action();
    shortcuts['Alt+KeyR'].action();
    shortcuts['Alt+KeyS'].action();
    expect(router.push.mock.calls).toEqual([
      [{ name: 'contacts_dashboard' }],
      [{ name: 'account_overview_reports' }],
      [{ name: 'agent_list' }],
    ]);
  });
});
