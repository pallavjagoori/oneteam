/**
 * OneTeam spec for the super admin page script on a page without the
 * optional widgets: every initializer finds nothing and stays quiet.
 */
import { vi } from 'vitest';

vi.mock('../../superadmin/commandBar', () => ({
  initializeCommandBar: vi.fn(),
}));

describe('super admin page script on a bare page', () => {
  it('skips the forms, tabs, filters, toasts and progress bar', async () => {
    document.body.innerHTML = `
      <form data-account-suspension-form></form>
      <div data-page-progress></div>`;
    window.matchMedia = vi.fn(() => ({ matches: false }));
    localStorage.setItem('super-admin-theme', 'dark');
    window.history.replaceState(null, '', '/super_admin');
    await import('../superadmin');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.location.search).toBe('');
  });
});
