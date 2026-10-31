/* eslint-disable max-classes-per-file */
/**
 * OneTeam spec for the super admin page script (entrypoints/superadmin.js).
 * The script wires document-level listeners when it is imported, so the page
 * markup is built first and the module is imported once for the whole file.
 */
import { vi } from 'vitest';

vi.mock('../../superadmin/commandBar', () => ({
  initializeCommandBar: vi.fn(),
}));

const flush = () =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
  });

const PAGE = `
  <div data-page-progress></div>
  <button data-theme-value="dark"></button>
  <button data-theme-value="light"></button>
  <button data-dialog-open="confirm-dialog">Open</button>
  <dialog id="confirm-dialog" data-backdrop-close>
    <form id="blank-form" target="_blank" action="/export"><button>Go</button></form>
  </dialog>
  <button data-support-chat>Help</button>
  <input id="password" type="password" />
  <button data-reveal="password"><span>show</span><span class="hidden">hide</span></button>
  <details data-dropdown open id="menu-a"><summary>A</summary><a id="inside-a">x</a></details>
  <details data-dropdown open id="menu-b"><summary>B</summary></details>
  <table><tbody><tr class="js-table-row"><td><button id="row-button">Row</button></td></tr></tbody></table>
  <div data-secret="s3cret">
    <span data-secret-text>••••••</span>
    <button data-secret-toggle><span>eye</span><span class="hidden">off</span></button>
    <button data-secret-copy><span>copy</span><span class="hidden">done</span></button>
  </div>
  <div data-secret="">
    <span data-secret-text></span>
    <button id="empty-toggle" data-secret-toggle></button>
  </div>
  <form id="search-form" data-search-filter="email"><input name="search" value="ada" /></form>
  <form id="plain-form"><input name="search" value="x" /></form>
  <form id="pending-form" action="/save">
    <button id="pending-button" data-pending-label="Saving">Save</button>
    <button id="plain-button">Plain</button>
  </form>
  <form id="copy-form" data-copy-link action="/links" data-copied-label="Copied" data-failed-label="Failed">
    <button>Copy link</button>
  </form>
  <table id="check-table">
    <thead><tr><th><input type="checkbox" data-check-toggle id="check-all-rows" /></th></tr></thead>
    <tbody><tr><td><input type="checkbox" /></td></tr><tr><td><input type="checkbox" /></td></tr></tbody>
  </table>
  <input type="checkbox" id="unrelated-checkbox" />
  <form data-account-suspension-form data-original-status="active" data-has-suspension-history="false">
    <select data-account-status-select><option value="active">a</option><option value="suspended">s</option></select>
    <div data-account-suspension-fields>
      <select data-suspension-category><option value="">-</option><option value="spam">spam</option></select>
      <textarea data-suspension-reason></textarea>
    </div>
  </form>
  <select id="platform_banner_banner_type"><option value="info">info</option><option value="feature_announcement">fa</option></select>
  <div data-field><input id="platform_banner_title" /></div>
  <div data-field><input id="platform_banner_video_url" /></div>
  <button data-tab="general">General</button>
  <button data-tab="limits">Limits</button>
  <form id="tab-form">
    <div data-tab-panel="general"><input id="name-field" /></div>
    <div data-tab-panel="limits" hidden><input id="limit-field" required /><input id="second-field" required /></div>
  </form>
  <input id="formless-field" required />
  <div data-filter-scope id="filters">
    <input data-filter-input />
    <button data-filter-state="all">All</button>
    <button data-filter-state="on">On</button>
    <button data-filter-state="off">Off</button>
    <button data-check-all>All</button>
    <button data-check-none>None</button>
    <span data-check-count="%{selected} of %{total}"></span>
    <div data-filter-group id="group-1">
      <label data-filter-item id="item-alpha"><input type="checkbox" checked />Alpha</label>
      <label data-filter-item id="item-beta"><input type="checkbox" />Beta</label>
      <label data-filter-item id="item-locked"><input type="checkbox" disabled />Locked</label>
    </div>
    <div data-filter-group id="group-2">
      <span data-filter-item data-state="on" id="item-gamma">Gamma</span>
    </div>
    <p data-filter-empty class="hidden">Nothing</p>
  </div>
  <div data-filter-scope id="bare-filters"><span data-filter-item>Only</span></div>
  <div data-toast id="toast"><button data-toast-close>x</button></div>
  <div data-toast data-toast-sticky id="sticky-toast"><button data-toast-close>x</button></div>
`;

const click = element =>
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const byId = id => document.getElementById(id);

let navigationListeners;
let bannerChange;
let systemDark;
let commandBarStarted;

beforeAll(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  document.body.innerHTML = PAGE;
  systemDark = { matches: true };
  window.matchMedia = vi.fn(() => systemDark);
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal() {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function close() {
    this.removeAttribute('open');
  });
  window.jQuery = vi.fn(() => ({
    on: (_event, handler) => {
      bannerChange = handler;
    },
  }));
  navigationListeners = {};
  window.navigation = {
    addEventListener: (type, handler) => {
      navigationListeners[type] = handler;
    },
  };
  window.history.replaceState(
    null,
    '',
    '/super_admin/accounts?suppression=ok&page=2'
  );
  localStorage.clear();
  await import('../superadmin');
  // The test config resets mocks between tests, so read the call count now.
  const { initializeCommandBar } = await import('../../superadmin/commandBar');
  commandBarStarted = initializeCommandBar.mock.calls.length;
});

afterAll(() => {
  vi.useRealTimers();
  delete window.navigation;
  delete window.jQuery;
});

describe('super admin page script', () => {
  describe('toasts', () => {
    it('hides a toast after eight seconds, pausing while hovered', () => {
      const toast = byId('toast');
      toast.dispatchEvent(new Event('mouseenter'));
      vi.advanceTimersByTime(9000);
      expect(toast.classList.contains('opacity-0')).toBe(false);
      toast.dispatchEvent(new Event('mouseleave'));
      vi.advanceTimersByTime(8000);
      expect(toast.classList.contains('opacity-0')).toBe(true);
      vi.advanceTimersByTime(300);
      expect(byId('toast')).toBeNull();
    });

    it('keeps a sticky toast until it is closed', () => {
      vi.advanceTimersByTime(20000);
      const toast = byId('sticky-toast');
      expect(toast).not.toBeNull();
      click(toast.querySelector('[data-toast-close]'));
      vi.advanceTimersByTime(300);
      expect(byId('sticky-toast')).toBeNull();
    });
  });

  it('starts the command bar and drops the suppression param', () => {
    expect(commandBarStarted).toBe(1);
    expect(window.location.search).toBe('?page=2');
  });

  it('applies the system theme, then the one picked with the switch', () => {
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    click(document.querySelector('[data-theme-value="light"]'));
    expect(localStorage.getItem('super-admin-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(
      document
        .querySelector('[data-theme-value="light"]')
        .getAttribute('aria-pressed')
    ).toBe('true');
    click(document.querySelector('[data-theme-value="dark"]'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('opens a dialog, closes it from the backdrop and closes open menus', () => {
    click(document.querySelector('[data-dialog-open]'));
    expect(byId('confirm-dialog').hasAttribute('open')).toBe(true);
    expect(byId('menu-a').hasAttribute('open')).toBe(false);
    click(byId('confirm-dialog'));
    expect(byId('confirm-dialog').hasAttribute('open')).toBe(false);
  });

  it('keeps the menu that was clicked open and closes menus on Escape', () => {
    byId('menu-a').setAttribute('open', '');
    byId('menu-b').setAttribute('open', '');
    click(byId('inside-a'));
    expect(byId('menu-a').hasAttribute('open')).toBe(true);
    expect(byId('menu-b').hasAttribute('open')).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(byId('menu-a').hasAttribute('open')).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
  });

  it('opens the support chat when the widget is loaded', () => {
    click(document.querySelector('[data-support-chat]'));
    window.$chatwoot = { toggle: vi.fn() };
    click(document.querySelector('[data-support-chat]'));
    expect(window.$chatwoot.toggle).toHaveBeenCalledWith('open');
    delete window.$chatwoot;
  });

  it('reveals and hides a password field', () => {
    const button = document.querySelector('[data-reveal]');
    click(button);
    expect(byId('password').type).toBe('text');
    expect(button.children[0].classList.contains('hidden')).toBe(true);
    click(button);
    expect(byId('password').type).toBe('password');
  });

  it('stops Enter and Space on a button inside a table row', () => {
    const rowHandler = vi.fn();
    document
      .querySelector('.js-table-row')
      .addEventListener('keydown', rowHandler);
    byId('row-button').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    expect(rowHandler).not.toHaveBeenCalled();
    document
      .querySelector('.js-table-row td')
      .dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(rowHandler).toHaveBeenCalledTimes(1);
  });

  it('shows and hides a secret, masking an empty one with ten dots', () => {
    const text = document.querySelector('[data-secret-text]');
    click(document.querySelector('[data-secret-toggle]'));
    expect(text.textContent).toBe('s3cret');
    click(document.querySelector('[data-secret-toggle]'));
    expect(text.textContent).toBe('••••••');
    // An empty secret already "shows" as empty text, so the first click masks it.
    const emptyText =
      byId('empty-toggle').parentElement.querySelector('[data-secret-text]');
    click(byId('empty-toggle'));
    expect(emptyText.textContent).toBe('••••••••••');
    click(byId('empty-toggle'));
    expect(emptyText.textContent).toBe('');
  });

  it('copies a secret and blocks a second copy until the timer resets', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const button = document.querySelector('[data-secret-copy]');
    click(button);
    await flush();
    expect(writeText).toHaveBeenCalledWith('s3cret');
    expect(button.disabled).toBe(true);
    click(button);
    expect(writeText).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1500);
    expect(button.disabled).toBe(false);
  });

  it('prefixes the search term with the list filter', () => {
    // jsdom builds FormData without firing the formdata event, so fire it.
    const fire = (form, entries) => {
      const event = new Event('formdata', { bubbles: true });
      event.formData = new FormData();
      Object.entries(entries).forEach(([key, value]) =>
        event.formData.set(key, value)
      );
      form.dispatchEvent(event);
      return event.formData.get('search');
    };
    expect(fire(byId('search-form'), { search: 'ada' })).toBe('email: ada');
    expect(fire(byId('search-form'), {})).toBe('email:');
    expect(fire(byId('plain-form'), { search: 'x' })).toBe('x');
  });

  it('shows a pending label on the button that submitted a form', async () => {
    byId('pending-form').addEventListener('submit', event =>
      event.preventDefault()
    );
    byId('pending-form').requestSubmit(byId('plain-button'));
    byId('pending-form').requestSubmit(byId('pending-button'));
    // The script leaves a submit that someone else cancelled alone.
    vi.advanceTimersByTime(1);
    await flush();
    expect(byId('pending-button').disabled).toBe(false);
  });

  it('turns the submit button into a spinner when the submit goes ahead', () => {
    const button = byId('pending-button');
    const event = new Event('submit', { bubbles: true });
    event.submitter = button;
    byId('plain-form').dispatchEvent(event);
    vi.advanceTimersByTime(1);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.textContent).toBe('Saving');
  });

  it('closes the dialog when its form opens in a new tab', () => {
    byId('confirm-dialog').setAttribute('open', '');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    byId('blank-form').dispatchEvent(event);
    expect(byId('confirm-dialog').hasAttribute('open')).toBe(false);
  });

  describe('copy link forms', () => {
    const form = () => byId('copy-form');
    const button = () => form().querySelector('button');
    const submit = () =>
      form().dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );

    afterEach(() => {
      vi.advanceTimersByTime(2000);
      delete window.ClipboardItem;
    });

    it('copies the returned link with a clipboard item', async () => {
      window.ClipboardItem = class {
        constructor(items) {
          this.items = items;
        }
      };
      const write = vi.fn(async ([item]) => item.items['text/plain']);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { write },
      });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: 'https://x.test/l' }),
        })
      );
      submit();
      expect(button().disabled).toBe(true);
      submit();
      expect(fetch).toHaveBeenCalledTimes(1);
      await flush();
      expect(button().textContent).toBe('Copied');
      const blob = await write.mock.calls[0][0][0].items['text/plain'];
      expect(blob.type).toBe('text/plain');
      vi.advanceTimersByTime(2000);
      expect(button().textContent).toBe('Copy link');
      expect(button().disabled).toBe(false);
    });

    it('falls back to writeText and reports a failed request', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
      global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));
      submit();
      await flush();
      expect(writeText).not.toHaveBeenCalled();
      expect(button().textContent).toBe('Failed');
    });

    it('falls back to writeText when the clipboard item is refused', async () => {
      window.ClipboardItem = class {
        constructor() {
          throw new Error('unsupported');
        }
      };
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText, write: vi.fn() },
      });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: 'https://x.test/2' }),
        })
      );
      submit();
      await flush();
      expect(writeText).toHaveBeenCalledWith('https://x.test/2');
      expect(button().textContent).toBe('Copied');
    });
  });

  it('checks every row from the header checkbox only', () => {
    const header = byId('check-all-rows');
    header.checked = true;
    header.dispatchEvent(new Event('change', { bubbles: true }));
    const rows = [...document.querySelectorAll('#check-table tbody input')];
    expect(rows.every(box => box.checked)).toBe(true);
    byId('unrelated-checkbox').dispatchEvent(
      new Event('change', { bubbles: true })
    );
    expect(rows.every(box => box.checked)).toBe(true);
  });

  it('asks for suspension details only when an active account is suspended', () => {
    const status = document.querySelector('[data-account-status-select]');
    const fields = document.querySelector('[data-account-suspension-fields]');
    const reason = document.querySelector('[data-suspension-reason]');
    expect(fields.classList.contains('hidden')).toBe(true);
    expect(reason.disabled).toBe(true);
    status.value = 'suspended';
    status.dispatchEvent(new Event('change'));
    expect(fields.classList.contains('hidden')).toBe(false);
    expect(reason.required).toBe(true);
    reason.value = 'spam';
    reason.dispatchEvent(new Event('input'));
    expect(reason.disabled).toBe(false);
  });

  it('enables the banner title and video only for feature announcements', () => {
    const title = byId('platform_banner_title');
    expect(title.disabled).toBe(true);
    expect(title.closest('[data-field]').classList.contains('hidden')).toBe(
      true
    );
    byId('platform_banner_banner_type').value = 'feature_announcement';
    bannerChange();
    expect(title.disabled).toBe(false);
  });

  it('switches tabs, remembers the tab and shows the tab of an invalid field', () => {
    click(document.querySelector('[data-tab="limits"]'));
    expect(document.querySelector('[data-tab-panel="limits"]').hidden).toBe(
      false
    );
    expect(document.querySelector('[data-tab-panel="general"]').hidden).toBe(
      true
    );
    expect(document.cookie).toContain('super_admin_tab=');
    click(document.querySelector('[data-tab="general"]'));
    // jsdom's selector engine overflows on :invalid, so the form answers the
    // query the browser would: the first required field is the first invalid.
    byId('tab-form').querySelector = () => byId('limit-field');
    // Only the first invalid field brings its tab forward.
    byId('second-field').dispatchEvent(new Event('invalid'));
    expect(document.querySelector('[data-tab-panel="limits"]').hidden).toBe(
      true
    );
    byId('limit-field').dispatchEvent(new Event('invalid'));
    expect(document.querySelector('[data-tab-panel="limits"]').hidden).toBe(
      false
    );
    // A field on a visible tab, or outside any form, changes nothing.
    byId('limit-field').dispatchEvent(new Event('invalid'));
    byId('formless-field').dispatchEvent(new Event('invalid'));
    expect(document.querySelector('[data-tab-panel="limits"]').hidden).toBe(
      false
    );
  });

  describe('list filters', () => {
    const scope = () => byId('filters');
    const hidden = id => byId(id).classList.contains('hidden');
    const counter = () => scope().querySelector('[data-check-count]');
    const input = () => scope().querySelector('[data-filter-input]');

    it('counts the checked boxes', () => {
      expect(counter().textContent).toBe('1 of 3');
    });

    it('filters by text, hides empty groups and shows the empty note', () => {
      input().value = 'gam';
      input().dispatchEvent(new Event('input'));
      expect(hidden('item-alpha')).toBe(true);
      expect(hidden('group-1')).toBe(true);
      expect(hidden('group-2')).toBe(false);
      input().value = 'zzz';
      input().dispatchEvent(new Event('input'));
      expect(
        scope()
          .querySelector('[data-filter-empty]')
          .classList.contains('hidden')
      ).toBe(false);
      input().value = '';
      input().dispatchEvent(new Event('input'));
    });

    it('keeps Enter from submitting the search box', () => {
      const enter = new KeyboardEvent('keydown', {
        key: 'Enter',
        cancelable: true,
      });
      input().dispatchEvent(enter);
      expect(enter.defaultPrevented).toBe(true);
      const other = new KeyboardEvent('keydown', {
        key: 'a',
        cancelable: true,
      });
      input().dispatchEvent(other);
      expect(other.defaultPrevented).toBe(false);
    });

    it('filters by on and off state', () => {
      click(scope().querySelector('[data-filter-state="on"]'));
      expect(hidden('item-alpha')).toBe(false);
      expect(hidden('item-beta')).toBe(true);
      expect(hidden('item-gamma')).toBe(false);
      click(scope().querySelector('[data-filter-state="off"]'));
      expect(hidden('item-alpha')).toBe(true);
      expect(hidden('item-gamma')).toBe(true);
      expect(
        scope()
          .querySelector('[data-filter-state="off"]')
          .getAttribute('aria-pressed')
      ).toBe('true');
      click(scope().querySelector('[data-filter-state="all"]'));
    });

    it('checks and clears the visible, enabled boxes', () => {
      click(scope().querySelector('[data-check-all]'));
      expect(counter().textContent).toBe('2 of 3');
      expect(byId('item-locked').querySelector('input').checked).toBe(false);
      click(scope().querySelector('[data-check-none]'));
      expect(counter().textContent).toBe('0 of 3');
      const box = byId('item-beta').querySelector('input');
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
      expect(counter().textContent).toBe('1 of 3');
    });

    it('works without a search box or counter', () => {
      byId('bare-filters').dispatchEvent(new Event('change'));
      expect(
        byId('bare-filters').querySelector('span').classList.contains('hidden')
      ).toBe(false);
    });
  });

  it('shows page progress for real navigations only', () => {
    const bar = document.querySelector('[data-page-progress]');
    navigationListeners.navigate({
      destination: { sameDocument: true },
      downloadRequest: null,
    });
    navigationListeners.navigate({
      destination: { sameDocument: false },
      downloadRequest: 'f.csv',
    });
    expect(bar.classList.contains('animate-page-progress')).toBe(false);
    navigationListeners.navigate({
      destination: { sameDocument: false },
      downloadRequest: null,
    });
    expect(bar.classList.contains('animate-page-progress')).toBe(true);
    navigationListeners.navigateerror();
    expect(bar.classList.contains('animate-page-progress')).toBe(false);
    bar.classList.add('animate-page-progress');
    window.dispatchEvent(new Event('pageshow'));
    expect(bar.classList.contains('animate-page-progress')).toBe(false);
  });
});
