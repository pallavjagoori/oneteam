/**
 * OneTeam behaviour spec for the help center articles index route.
 *
 * Covers fetching articles from the route filters (status tab, "mine",
 * category, locale, search), refetching when the route changes, paging,
 * searching (updating the URL query), position-sorted articles on
 * category views, building the locale list from the portal, and
 * loading the portal with its categories and agents.
 */
import { reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import PortalsArticlesIndexPage from '../PortalsArticlesIndexPage.vue';

const route = reactive({ name: '', params: {}, query: {} });
const replace = vi.fn();
const dispatch = vi.fn();
const portal = ref(null);

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route,
  useRouter: () => ({ replace }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: name =>
    ({
      'articles/allArticles': ref(['all']),
      'articles/allArticlesSortedByPosition': ref(['sorted']),
      'categories/allCategories': ref(['cat']),
      'articles/getMeta': ref({ count: 1 }),
      'portals/getMeta': ref({ portals: 1 }),
      getCurrentUserID: ref(5),
      'portals/portalBySlug': ref(() => portal.value),
    })[name],
}));

const ArticlesPage = {
  name: 'ArticlesPage',
  props: [
    'articles',
    'portalName',
    'categories',
    'allowedLocales',
    'meta',
    'portalMeta',
    'isCategoryArticles',
  ],
  emits: ['pageChange', 'search', 'fetchPortal', 'refreshArticles'],
  template: '<div class="articles" />',
};

const mountPage = () =>
  mount(PortalsArticlesIndexPage, {
    global: { stubs: { ArticlesPage } },
  });

const lastIndex = () =>
  dispatch.mock.calls
    .filter(([action]) => action === 'articles/index')
    .at(-1)[1];

describe('PortalsArticlesIndexPage behaviour', () => {
  beforeEach(() => {
    route.name = 'portals_articles_index';
    route.params = { portalSlug: 'docs', locale: 'en', tab: 'draft' };
    route.query = {};
    portal.value = {
      name: 'Docs',
      config: { allowed_locales: [{ code: 'en' }, { code: 'fr' }] },
      meta: { default_locale: 'fr' },
    };
  });

  it('renders nothing without a portal', () => {
    portal.value = null;
    const wrapper = mountPage();
    expect(wrapper.findComponent(ArticlesPage).exists()).toBe(false);
    expect(wrapper.vm.$.setupState.allowedLocales).toEqual([]);
  });

  it('fetches articles for the route and lists locales', async () => {
    const wrapper = mountPage();
    expect(lastIndex()).toEqual({
      pageNumber: 1,
      portalSlug: 'docs',
      locale: 'en',
      status: 0,
      authorId: null,
      categorySlug: undefined,
      query: undefined,
    });
    const page = wrapper.findComponent(ArticlesPage);
    expect(page.props()).toMatchObject({
      articles: ['all'],
      portalName: 'Docs',
      categories: ['cat'],
      meta: { count: 1 },
      portalMeta: { portals: 1 },
      isCategoryArticles: false,
      allowedLocales: [
        { id: 'en', name: 'English', code: 'en' },
        { id: 'fr', name: 'French', code: 'fr' },
      ],
    });

    route.params = { portalSlug: 'docs', locale: 'en', tab: 'mine' };
    await flushPromises();
    expect(lastIndex()).toMatchObject({ authorId: 5, status: undefined });
  });

  it('pages, searches and refreshes', async () => {
    route.query = { search: 'old', other: 'x' };
    const wrapper = mountPage();
    expect(lastIndex().query).toBe('old');
    const page = wrapper.findComponent(ArticlesPage);
    await page.vm.$emit('pageChange', 3);
    expect(lastIndex().pageNumber).toBe(3);

    await page.vm.$emit('search', 'billing');
    expect(replace).toHaveBeenCalledWith({
      query: { search: 'billing', other: 'x' },
    });
    expect(lastIndex()).toMatchObject({ pageNumber: 1, query: 'billing' });

    await page.vm.$emit('search', '');
    expect(replace).toHaveBeenLastCalledWith({
      query: { search: undefined, other: 'x' },
    });
    expect(lastIndex().query).toBeUndefined();

    await page.vm.$emit('refreshArticles');
    expect(lastIndex().pageNumber).toBe(1);
  });

  it.each([
    'portals_categories_articles_index',
    'portals_categories_articles_edit',
    'portals_categories_index',
  ])('uses position-sorted articles on %s', name => {
    route.name = name;
    const wrapper = mountPage();
    const page = wrapper.findComponent(ArticlesPage);
    expect(page.props('articles')).toEqual(['sorted']);
    expect(page.props('isCategoryArticles')).toBe(true);
  });

  it('loads the portal, categories and agents', async () => {
    const wrapper = mountPage();
    const page = wrapper.findComponent(ArticlesPage);
    await page.vm.$emit('fetchPortal', 'de');
    await flushPromises();
    expect(dispatch).toHaveBeenCalledWith('portals/index');
    expect(dispatch).toHaveBeenCalledWith('portals/show', {
      portalSlug: 'docs',
      locale: 'de',
    });
    expect(dispatch).toHaveBeenCalledWith('categories/index', {
      portalSlug: 'docs',
      locale: 'de',
    });
    expect(dispatch).toHaveBeenCalledWith('agents/get');

    route.params = { portalSlug: 'docs' };
    await flushPromises();
    await page.vm.$emit('fetchPortal');
    await flushPromises();
    expect(dispatch).toHaveBeenLastCalledWith('agents/get');
    expect(dispatch).toHaveBeenCalledWith('portals/show', {
      portalSlug: 'docs',
      locale: 'fr',
    });
  });
});
