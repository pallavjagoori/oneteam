/**
 * OneTeam behaviour spec for the "insert help center article" popover.
 *
 * Covers loading the most viewed articles on open, searching, ignoring
 * search failures, article URLs and locale names (custom domain, default
 * locale), previewing an article (plain layout, dark theme), going back,
 * inserting from the list or the preview, and closing (header button or
 * outside click) which resets the popover.
 */
import { flushPromises, mount } from '@vue/test-utils';
import ArticlesAPI from 'dashboard/api/helpCenter/articles';
import { useAlert } from 'dashboard/composables';
import { buildPortalArticleURL } from 'dashboard/helper/portalHelper';
import SearchPopover from '../SearchPopover.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  debounce: fn => fn,
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/helpCenter/articles', () => ({
  default: { searchArticles: vi.fn() },
}));
vi.mock('dashboard/helper/portalHelper', () => ({
  buildPortalArticleURL: vi.fn(
    (portal, category, locale, slug) =>
      `https://help.example.com/${portal}/${slug}`
  ),
}));

const Header = {
  name: 'SearchHeader',
  props: ['title'],
  emits: ['close', 'search'],
  template: '<header />',
};
const Results = {
  name: 'SearchResults',
  props: ['searchQuery', 'isLoading', 'portalSlug', 'articles'],
  emits: ['preview', 'insert'],
  template: '<ul class="results" />',
};
const View = {
  name: 'ArticleView',
  props: ['url'],
  emits: ['back', 'insert'],
  template: '<article />',
};

const articles = [
  { id: 1, slug: 'reset', category: { locale: 'fr' } },
  { id: 2, slug: 'billing', category: {} },
];

const mountPopover = async (portal = { custom_domain: 'docs.acme.com' }) => {
  const wrapper = mount(SearchPopover, {
    props: { selectedPortalSlug: 'acme' },
    global: {
      stubs: {
        SearchHeader: Header,
        SearchResults: Results,
        ArticleView: View,
      },
      directives: {
        onClickaway: {
          mounted: (el, binding) => {
            env.clickaway = binding.value;
          },
        },
      },
      mocks: {
        $t: key => key,
        $store: { getters: { 'portals/portalBySlug': () => portal } },
      },
    },
  });
  await flushPromises();
  return wrapper;
};
const results = wrapper => wrapper.findComponent(Results);

beforeEach(() => {
  ArticlesAPI.searchArticles.mockResolvedValue({
    data: { payload: articles },
  });
});

afterEach(() => {
  document.body.classList.remove('dark');
});

describe('SearchPopover behaviour', () => {
  it('loads the most viewed articles with URLs and locale names', async () => {
    const wrapper = await mountPopover();
    expect(ArticlesAPI.searchArticles).toHaveBeenCalledWith({
      portalSlug: 'acme',
      query: '',
      sort: 'views',
    });
    expect(buildPortalArticleURL).toHaveBeenCalledWith(
      'acme',
      '',
      '',
      'reset',
      'docs.acme.com'
    );
    const listed = results(wrapper).props('articles');
    expect(listed.map(a => [a.localeName, a.url])).toEqual([
      ['French', 'https://help.example.com/acme/reset'],
      ['English', 'https://help.example.com/acme/billing'],
    ]);
    expect(results(wrapper).props('isLoading')).toBe(false);
  });

  it('builds URLs without a portal', async () => {
    await mountPopover(null);
    expect(buildPortalArticleURL).toHaveBeenCalledWith(
      'acme',
      '',
      '',
      'reset',
      undefined
    );
  });

  it('searches by query and ignores failures', async () => {
    const wrapper = await mountPopover();
    wrapper.findComponent(Header).vm.$emit('search', 'reset');
    await flushPromises();
    expect(ArticlesAPI.searchArticles).toHaveBeenLastCalledWith({
      portalSlug: 'acme',
      query: 'reset',
      sort: '',
    });
    expect(results(wrapper).props('searchQuery')).toBe('reset');

    ArticlesAPI.searchArticles.mockRejectedValueOnce(new Error('down'));
    wrapper.findComponent(Header).vm.$emit('search', 'x');
    await flushPromises();
    expect(results(wrapper).props('articles')).toEqual([]);
    expect(results(wrapper).props('isLoading')).toBe(false);
  });

  it('previews an article and goes back', async () => {
    const wrapper = await mountPopover();
    results(wrapper).vm.$emit('preview', 1);
    await flushPromises();
    expect(wrapper.findComponent(View).props('url')).toBe(
      'https://help.example.com/acme/reset?show_plain_layout=true'
    );
    wrapper.findComponent(View).vm.$emit('back');
    await flushPromises();
    expect(wrapper.findComponent(View).exists()).toBe(false);
  });

  it('previews in the dark theme', async () => {
    document.body.classList.add('dark');
    const wrapper = await mountPopover();
    results(wrapper).vm.$emit('preview', 2);
    await flushPromises();
    expect(wrapper.findComponent(View).props('url')).toBe(
      'https://help.example.com/acme/billing?show_plain_layout=true&theme=dark'
    );
  });

  it('has no preview URL for an unknown article', async () => {
    const wrapper = await mountPopover();
    results(wrapper).vm.$emit('preview', 99);
    await flushPromises();
    expect(wrapper.findComponent(View).props('url')).toBe('');
  });

  it('inserts from the list and resets', async () => {
    const wrapper = await mountPopover();
    results(wrapper).vm.$emit('insert', 2);
    await flushPromises();
    expect(wrapper.emitted('insert')[0][0]).toMatchObject({ id: 2 });
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.ARTICLE_SEARCH.SUCCESS_ARTICLE_INSERTED'
    );
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(results(wrapper).props('articles')).toEqual([]);
  });

  it('inserts the previewed article', async () => {
    const wrapper = await mountPopover();
    results(wrapper).vm.$emit('preview', 1);
    await flushPromises();
    wrapper.findComponent(View).vm.$emit('insert');
    expect(wrapper.emitted('insert')[0][0]).toMatchObject({ id: 1 });
  });

  it('closes from the header or an outside click', async () => {
    const wrapper = await mountPopover();
    wrapper.findComponent(Header).vm.$emit('close');
    env.clickaway();
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
