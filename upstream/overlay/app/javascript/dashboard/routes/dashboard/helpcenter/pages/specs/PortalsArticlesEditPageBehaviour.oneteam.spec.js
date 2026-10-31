/**
 * OneTeam behaviour spec for the help center article edit page.
 *
 * Covers loading the article, saving (with the saved and updating
 * flags), how edits are staged: straight to the live record for
 * unpublished articles (promoting a leftover draft), into draft fields
 * for published ones (cleared when they match the live version), save
 * errors, previewing on the portal or its custom domain, and going back
 * to the article or category list.
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import Page from '../PortalsArticlesEditPage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => env.store,
  useMapGetter: name => computed(() => env.state[name]),
}));

const Editor = {
  name: 'ArticleEditor',
  props: ['article', 'isUpdating', 'isSaved'],
  emits: ['saveArticle', 'previewArticle', 'goBack'],
  template: '<div />',
};

const mountPage = async ({
  article = {},
  routeName = 'portals_articles_edit',
  portal = {},
} = {}) => {
  env.route = {
    name: routeName,
    params: {
      articleSlug: 'a1',
      portalSlug: 'docs',
      tab: 'all',
      categorySlug: 'faq',
      locale: 'en',
    },
  };
  env.router = { push: vi.fn() };
  env.store = { dispatch: vi.fn().mockResolvedValue() };
  env.state = reactive({
    'articles/articleById': () => ({
      slug: 'getting-started',
      status: 'draft',
      title: 'Live',
      content: 'Body',
      category: { slug: 'faq', locale: 'en' },
      ...article,
    }),
    'portals/portalBySlug': () => portal,
  });
  const wrapper = mount(Page, { global: { stubs: { ArticleEditor: Editor } } });
  await flushPromises();
  return wrapper;
};

const save = async (wrapper, values) => {
  wrapper.findComponent(Editor).vm.$emit('saveArticle', values);
  await flushPromises();
  return env.store.dispatch.mock.calls.at(-1)[1];
};

describe('Article edit page behaviour', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('loads the article and saves with status flags', async () => {
    const wrapper = await mountPage();
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/show', {
      id: 'a1',
      portalSlug: 'docs',
    });
    expect(await save(wrapper, { title: 'New' })).toEqual({
      portalSlug: 'docs',
      articleId: 'a1',
      title: 'New',
    });
    expect(wrapper.findComponent(Editor).props()).toMatchObject({
      isUpdating: true,
      isSaved: true,
    });
    await vi.advanceTimersByTimeAsync(1500);
    expect(wrapper.findComponent(Editor).props('isUpdating')).toBe(false);
  });

  it('promotes a leftover draft when saving an unpublished article', async () => {
    let wrapper = await mountPage({
      article: { draftTitle: 'Draft title', draftContent: null },
    });
    expect(await save(wrapper, { content: 'Edited' })).toMatchObject({
      title: 'Draft title',
      content: 'Edited',
      draft_title: null,
      draft_content: null,
    });
    wrapper = await mountPage({ article: { draftContent: 'Draft body' } });
    expect(await save(wrapper, { title: 'T' })).toMatchObject({
      title: 'T',
      content: 'Draft body',
    });
    wrapper = await mountPage({
      article: { draftTitle: null, draftContent: 'D' },
    });
    expect(await save(wrapper, {})).toMatchObject({
      title: 'Live',
      content: 'D',
    });
    wrapper = await mountPage({
      article: { draftTitle: 'X', draftContent: undefined, content: 'C' },
    });
    expect(await save(wrapper, {})).toMatchObject({ title: 'X', content: 'C' });
  });

  it('stages edits to a published article as a draft', async () => {
    const wrapper = await mountPage({ article: { status: 'published' } });
    expect(
      await save(wrapper, { title: 'Next', content: 'More', views: 1 })
    ).toEqual({
      portalSlug: 'docs',
      articleId: 'a1',
      views: 1,
      draft_title: 'Next',
      draft_content: 'More',
    });
    expect(
      await save(wrapper, { title: 'Live', content: 'Body\n\n' })
    ).toMatchObject({ draft_title: null, draft_content: null });
    expect(await save(wrapper, { content: 'Body' })).toMatchObject({
      draft_title: null,
      draft_content: null,
    });
  });

  it('keeps an existing draft when only one field changes', async () => {
    const wrapper = await mountPage({
      article: {
        status: 'published',
        draftTitle: 'Pending',
        draftContent: 'Other',
        title: null,
        content: null,
      },
    });
    expect(await save(wrapper, { title: 'Pending 2' })).toEqual({
      portalSlug: 'docs',
      articleId: 'a1',
      draft_title: 'Pending 2',
    });
    const live = await mountPage({
      article: { status: 'published', title: null, content: null },
    });
    expect(await save(live, { title: '' })).toMatchObject({
      draft_title: null,
      draft_content: null,
    });
  });

  it('reports save errors', async () => {
    const wrapper = await mountPage();
    env.store.dispatch.mockRejectedValueOnce(new Error('Slug taken'));
    await save(wrapper, {});
    expect(useAlert).toHaveBeenLastCalledWith('Slug taken');
    env.store.dispatch.mockRejectedValueOnce({});
    await save(wrapper, {});
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.API.ERROR'
    );
  });

  it('previews the article on the portal', async () => {
    window.chatwootConfig = { hostURL: 'https://app.test' };
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    let wrapper = await mountPage({
      portal: { custom_domain: 'help.acme.test' },
    });
    wrapper.findComponent(Editor).vm.$emit('previewArticle');
    expect(open.mock.calls[0][0]).toContain('help.acme.test');
    expect(open.mock.calls[0][0]).toContain('getting-started');
    expect(useTrack).toHaveBeenCalledWith(expect.any(String), {
      status: 'draft',
    });
    wrapper = await mountPage({ portal: null });
    wrapper.findComponent(Editor).vm.$emit('previewArticle');
    expect(open.mock.calls[1][0]).toContain('/hc/docs/');
    open.mockRestore();
  });

  it('goes back to the article or category list', async () => {
    let wrapper = await mountPage();
    wrapper.findComponent(Editor).vm.$emit('goBack');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'portals_articles_index',
      params: { tab: 'all', categorySlug: 'faq', locale: 'en' },
    });
    const names = [
      'portals_categories_articles_index',
      'portals_categories_articles_edit',
      'portals_categories_index',
    ];
    await names.reduce(async (previous, name) => {
      await previous;
      wrapper = await mountPage({ routeName: name });
      wrapper.findComponent(Editor).vm.$emit('goBack');
      expect(env.router.push).toHaveBeenCalledWith({
        name: 'portals_categories_articles_index',
        params: { categorySlug: 'faq', locale: 'en' },
      });
    }, Promise.resolve());
  });
});
