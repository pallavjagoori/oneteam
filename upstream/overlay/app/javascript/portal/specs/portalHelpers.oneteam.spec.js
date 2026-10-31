/**
 * OneTeam specs for the help center portal's page setup: the table of
 * contents, search boxes, theme toggle, plain (embedded) layout, text
 * direction, closing dropdowns and jumping to an anchor on load.
 */
import {
  InitializationHelpers,
  getHeadingsfromTheArticle,
  openExternalLinksInNewTab,
} from '../portalHelpers';

vi.mock('../portalThemeHelper.js', () => ({ initializeTheme: vi.fn() }));
vi.mock('../components/PublicArticleSearch.vue', () => ({
  default: {
    props: ['size', 'showKbd'],
    template:
      '<div class="search" :data-size="size" :data-kbd="String(showKbd)" />',
  },
}));
vi.mock('../components/TableOfContents.vue', () => ({
  default: {
    props: ['rows'],
    template:
      '<ol class="toc"><li v-for="row in rows" :key="row.slug">{{ row.slug }}</li></ol>',
  },
}));
vi.mock('../components/SidebarThemeToggle.vue', () => ({
  default: { template: '<button class="theme-toggle" />' },
}));

const flush = () =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
  });

describe('portal page setup', () => {
  beforeEach(() => {
    window.portalConfig = {
      customDomain: '',
      hostURL: '',
      isPlainLayoutEnabled: 'false',
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-dir-applied');
    document.documentElement.lang = '';
  });

  it('gives each article heading an anchor and permalink', () => {
    document.body.innerHTML = `
      <div id="cw-article-content"><h1>Getting started</h1><h2>Install</h2><p>x</p><h3>Install</h3></div>`;
    document.querySelectorAll('h1, h2, h3').forEach(heading => {
      // jsdom has no layout, so innerText is not computed.
      Object.defineProperty(heading, 'innerText', {
        value: heading.textContent,
      });
    });

    const rows = getHeadingsfromTheArticle();

    expect(rows.map(row => row.tag)).toEqual(['h1', 'h2', 'h3']);
    expect(rows[0]).toEqual({
      slug: 'getting-started',
      title: 'Getting started',
      tag: 'h1',
    });
    const heading = document.getElementById('getting-started');
    expect(heading.className).toBe('scroll-mt-24 heading');
    const permalink = heading.querySelector('a.permalink');
    expect(permalink.getAttribute('href')).toBe('#getting-started');
    expect(permalink.dataset.turbo).toBe('false');
  });

  it('mounts the search boxes with their size and shortcut hint', async () => {
    document.body.innerHTML =
      '<div id="search-wrap" data-size="large" data-kbd="1"></div><div id="search-wrap-hero"></div>';

    InitializationHelpers.initializeSearch();
    await flush();

    const [main, hero] = document.querySelectorAll('.search');
    expect(main.dataset).toMatchObject({ size: 'large', kbd: 'true' });
    expect(hero.dataset).toMatchObject({ size: 'default', kbd: 'false' });
  });

  it('skips the search, contents and theme toggle when the page has no slot for them', () => {
    InitializationHelpers.initializeSearch();
    InitializationHelpers.initializeTableOfContents();
    InitializationHelpers.initializeSidebarThemeToggle();

    expect(document.body.innerHTML).toBe('');
  });

  it('mounts the table of contents from the article headings', async () => {
    document.body.innerHTML =
      '<div id="cw-hc-toc"></div><div id="cw-article-content"><h2>Billing</h2></div>';
    Object.defineProperty(document.querySelector('h2'), 'innerText', {
      value: 'Billing',
    });

    InitializationHelpers.initializeTableOfContents();
    await flush();

    expect(document.querySelector('.toc').textContent).toBe('billing');
  });

  it('mounts the sidebar theme toggle', async () => {
    document.body.innerHTML = '<div id="sidebar-theme-toggle"></div>';

    InitializationHelpers.initializeSidebarThemeToggle();
    await flush();

    expect(document.querySelector('.theme-toggle')).not.toBeNull();
  });

  it('closes open dropdowns marked to close when clicking elsewhere', () => {
    document.body.innerHTML = `
      <details id="menu" data-close-on-clickaway open><summary>Menu</summary><a id="inside">Item</a></details>
      <details id="other" open><summary>Other</summary></details>
      <p id="outside">x</p>`;
    InitializationHelpers.initializeDetailsClickAway();

    document
      .getElementById('inside')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('menu').hasAttribute('open')).toBe(true);

    document
      .getElementById('outside')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('menu').hasAttribute('open')).toBe(false);
    expect(document.getElementById('other').hasAttribute('open')).toBe(true);
  });

  it('keeps help center links in the plain layout', () => {
    document.body.innerHTML =
      '<a id="hc" href="https://help.example.com/hc/acme/en">Docs</a><a id="site" href="https://example.com/">Site</a><a id="none">No link</a>';

    InitializationHelpers.appendPlainParamToURLs();

    expect(document.getElementById('hc').getAttribute('href')).toBe(
      'https://help.example.com/hc/acme/en?show_plain_layout=true'
    );
    expect(document.getElementById('site').getAttribute('href')).toBe(
      'https://example.com/'
    );
  });

  it('sets the text direction from the page language unless already set', () => {
    const html = document.documentElement;

    html.lang = 'ar';
    InitializationHelpers.setDirectionAttribute();
    expect(html.dir).toBe('rtl');

    html.lang = 'en';
    InitializationHelpers.setDirectionAttribute();
    expect(html.dir).toBe('ltr');

    html.lang = '';
    InitializationHelpers.setDirectionAttribute();
    expect(html.dir).toBe('ltr');

    html.setAttribute('data-dir-applied', 'true');
    html.lang = 'ar';
    InitializationHelpers.setDirectionAttribute();
    expect(html.dir).toBe('ltr');
  });

  it('sets up the full portal, or only plain links in the plain layout', () => {
    const helpers = [
      'initializeThemesInPortal',
      'navigateToLocalePage',
      'initializeSearch',
      'initializeTableOfContents',
      'initializeSidebarThemeToggle',
      'initializeDetailsClickAway',
      'appendPlainParamToURLs',
    ];
    const spies = Object.fromEntries(
      helpers.map(name => [
        name,
        vi.spyOn(InitializationHelpers, name).mockImplementation(() => {}),
      ])
    );

    InitializationHelpers.initialize();
    helpers
      .slice(0, 6)
      .forEach(name => expect(spies[name]).toHaveBeenCalledTimes(1));
    expect(spies.appendPlainParamToURLs).not.toHaveBeenCalled();

    window.portalConfig.isPlainLayoutEnabled = 'true';
    InitializationHelpers.initialize();
    expect(spies.appendPlainParamToURLs).toHaveBeenCalledTimes(1);
    expect(spies.initializeSearch).toHaveBeenCalledTimes(1);
    Object.values(spies).forEach(spy => spy.mockRestore());
  });

  it('jumps to the anchor in the URL after loading', () => {
    const initialize = vi
      .spyOn(InitializationHelpers, 'initialize')
      .mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    InitializationHelpers.onLoad();
    expect(click).not.toHaveBeenCalled();

    // jsdom has no scroll restoration; browsers do.
    Object.defineProperty(window.history, 'scrollRestoration', {
      value: 'auto',
      writable: true,
      configurable: true,
    });
    window.location.hash = '#install';
    InitializationHelpers.onLoad();
    expect(window.history.scrollRestoration).toBe('manual');
    expect(click).toHaveBeenCalledTimes(1);

    window.location.hash = '';
    delete window.history.scrollRestoration;
    initialize.mockRestore();
    click.mockRestore();
  });

  it('jumps to the anchor even where the browser has no scroll restoration', () => {
    vi.spyOn(InitializationHelpers, 'initialize').mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    window.location.hash = '#faq';

    InitializationHelpers.onLoad();

    expect('scrollRestoration' in window.history).toBe(false);
    expect(click).toHaveBeenCalledTimes(1);
    window.location.hash = '';
  });

  it('opens external article links in a new tab and leaves internal ones', () => {
    window.portalConfig = {
      customDomain: 'https://docs.acme.test',
      hostURL: 'https://app.chatwoot.test',
    };
    document.body.innerHTML = `
      <div id="cw-article-content">
        <a id="ext" href="https://elsewhere.test/page">x</a>
        <a id="custom" href="https://docs.acme.test/a">x</a>
        <a id="host" href="https://app.chatwoot.test/hc">x</a>
        <span id="text">x</span>
      </div>`;
    openExternalLinksInNewTab();
    const click = id =>
      document
        .getElementById(id)
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    ['ext', 'custom', 'host', 'text'].forEach(click);

    expect(document.getElementById('ext').target).toBe('_blank');
    expect(document.getElementById('ext').rel).toBe('noopener noreferrer');
    expect(document.getElementById('custom').target).toBe('');
    expect(document.getElementById('host').target).toBe('');
  });
});
