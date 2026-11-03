/**
 * Covers picking a theme from the mobile appearance menu: the menu closes
 * and, after the transition delay, the mobile menu toggle is unchecked.
 */
import { initializeThemeHandlers } from '../portalThemeHelper';

describe('portal theme mobile menu', () => {
  it('closes the mobile menu after picking a theme', () => {
    vi.useFakeTimers();
    window.portalConfig = { portalColor: '#ff5733' };
    document.body.innerHTML = `
      <button id="toggle-appearance"></button>
      <div id="appearance-dropdown" class="appearance-menu"></div>
      <div id="mobile-appearance-dropdown" class="appearance-menu" data-dropdown-open="true">
        <button data-theme="dark">Dark</button>
      </div>
      <input id="mobile-menu-toggle" type="checkbox" checked />
    `;
    initializeThemeHandlers();
    document.querySelector('button[data-theme="dark"]').click();
    const menu = document.getElementById('mobile-appearance-dropdown');
    expect(menu.dataset.dropdownOpen).toBe('false');
    expect(document.getElementById('mobile-menu-toggle').checked).toBe(true);
    vi.advanceTimersByTime(300);
    expect(document.getElementById('mobile-menu-toggle').checked).toBe(false);

    document.getElementById('mobile-menu-toggle').remove();
    menu.dataset.dropdownOpen = 'true';
    document.querySelector('button[data-theme="dark"]').click();
    vi.advanceTimersByTime(300);
    expect(menu.dataset.dropdownOpen).toBe('false');
    vi.useRealTimers();
    delete window.portalConfig;
  });
});
