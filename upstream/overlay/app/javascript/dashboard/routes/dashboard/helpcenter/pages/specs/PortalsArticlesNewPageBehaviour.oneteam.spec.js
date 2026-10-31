/**
 * OneTeam behaviour spec for the help center new article page.
 *
 * Covers keeping edits locally, creating the article once it has a
 * title (never twice at once), the default author and category (route
 * category, first category or none), saving edits made while the
 * create request ran (and alerting when that fails), opening the edit
 * page from the article or category list, create errors, and going back.
 */
import { computed, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import Page from '../PortalsArticlesNewPage.vue';

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
  emits: ['createArticle', 'saveArticle', 'goBack', 'setAuthor', 'setCategory'],
  template: '<div />',
};

const CATEGORIES = [
  { id: 1, slug: 'faq' },
  { id: 2, slug: 'billing' },
];

const mountPage = async ({
  routeName = 'portals_articles_new',
  categorySlug,
  categories = CATEGORIES,
} = {}) => {
  env.route = {
    name: routeName,
    params: { portalSlug: 'docs', locale: 'en', tab: 'all', categorySlug },
  };
  env.router = { push: vi.fn(), replace: vi.fn().mockResolvedValue() };
  env.store = {
    dispatch: vi.fn(action =>
      Promise.resolve(action === 'articles/create' ? 77 : undefined)
    ),
  };
  env.state = reactive({
    getCurrentUserID: 5,
    'categories/allCategories': categories,
  });
  const wrapper = mount(Page, { global: { stubs: { ArticleEditor: Editor } } });
  await flushPromises();
  return wrapper;
};

const editor = wrapper => wrapper.findComponent(Editor);
const create = async (wrapper, values) => {
  editor(wrapper).vm.$emit('createArticle', values);
  await flushPromises();
};
const createCall = () =>
  env.store.dispatch.mock.calls.find(
    ([name]) => name === 'articles/create'
  )?.[1];

describe('New article page behaviour', () => {
  it('waits for a title before creating', async () => {
    const wrapper = await mountPage();
    editor(wrapper).vm.$emit('saveArticle', { content: 'Draft body' });
    expect(editor(wrapper).props('article')).toEqual({ content: 'Draft body' });
    await create(wrapper, {});
    expect(env.store.dispatch).not.toHaveBeenCalled();

    await create(wrapper, { title: 'Hello', content: 'Body' });
    expect(createCall()).toEqual({
      portalSlug: 'docs',
      title: 'Hello',
      content: 'Body',
      locale: 'en',
      authorId: 5,
      categoryId: 1,
    });
    expect(useTrack).toHaveBeenCalledWith(expect.any(String), { locale: 'en' });
    expect(env.router.replace).toHaveBeenCalledWith({
      name: 'portals_articles_edit',
      params: { articleSlug: 77, portalSlug: 'docs', locale: 'en' },
    });
    expect(editor(wrapper).props('isUpdating')).toBe(false);
  });

  it('uses the picked author and category', async () => {
    const wrapper = await mountPage({ categories: [] });
    editor(wrapper).vm.$emit('setAuthor', 9);
    editor(wrapper).vm.$emit('setCategory', 2);
    await create(wrapper, { title: 'T' });
    expect(createCall()).toMatchObject({ authorId: 9, categoryId: 2 });
  });

  it('defaults to no category when there are none', async () => {
    const wrapper = await mountPage({ categories: [] });
    await create(wrapper, { title: 'T' });
    expect(createCall()).toMatchObject({ categoryId: null });
  });

  it('starts in the route category and returns to it', async () => {
    let wrapper = await mountPage({
      routeName: 'portals_categories_articles_new',
      categorySlug: 'billing',
    });
    await create(wrapper, { title: 'T' });
    expect(createCall()).toMatchObject({ categoryId: 2 });
    expect(env.router.replace).toHaveBeenCalledWith({
      name: 'portals_categories_articles_edit',
      params: {
        articleSlug: 77,
        portalSlug: 'docs',
        locale: 'en',
        categorySlug: 'billing',
      },
    });

    wrapper = await mountPage({
      routeName: 'portals_categories_articles_new',
      categorySlug: 'gone',
    });
    editor(wrapper).vm.$emit('setCategory', 99);
    await create(wrapper, { title: 'T' });
    expect(createCall()).toMatchObject({ categoryId: 99 });
    expect(env.router.replace.mock.calls[0][0].params.categorySlug).toBe(
      'gone'
    );
  });

  it('saves edits made while creating and ignores repeat creates', async () => {
    const wrapper = await mountPage({ categorySlug: 'faq' });
    let finish;
    env.store.dispatch.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    editor(wrapper).vm.$emit('createArticle', { title: 'First' });
    await flushPromises();
    expect(editor(wrapper).props('isUpdating')).toBe(true);
    editor(wrapper).vm.$emit('createArticle', { title: 'Second' });
    editor(wrapper).vm.$emit('setCategory', 2);
    finish(77);
    await flushPromises();
    expect(
      env.store.dispatch.mock.calls.filter(([n]) => n === 'articles/create')
    ).toHaveLength(1);
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/update', {
      portalSlug: 'docs',
      articleId: 77,
      title: 'Second',
      content: undefined,
      author_id: 5,
      category_id: 2,
    });
    expect(env.router.replace.mock.calls[0][0].params.categorySlug).toBe(
      'billing'
    );
  });

  it('opens the article even when saving later edits fails', async () => {
    const wrapper = await mountPage();
    let finish;
    env.store.dispatch
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      )
      .mockRejectedValueOnce(new Error('Conflict'))
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      )
      .mockRejectedValueOnce({});
    editor(wrapper).vm.$emit('createArticle', { title: 'A' });
    await flushPromises();
    editor(wrapper).vm.$emit('saveArticle', { content: 'later' });
    finish(77);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('Conflict');
    expect(env.router.replace).toHaveBeenCalledTimes(1);

    editor(wrapper).vm.$emit('createArticle', { title: 'B' });
    await flushPromises();
    editor(wrapper).vm.$emit('saveArticle', { content: 'later again' });
    finish(78);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.API.ERROR'
    );
  });

  it('reports create errors', async () => {
    const wrapper = await mountPage();
    env.store.dispatch.mockRejectedValueOnce(new Error('Title taken'));
    await create(wrapper, { title: 'T' });
    expect(useAlert).toHaveBeenLastCalledWith('Title taken');
    env.store.dispatch.mockRejectedValueOnce({});
    await create(wrapper, { title: 'T' });
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.API.ERROR'
    );
    expect(env.router.replace).not.toHaveBeenCalled();
  });

  it('goes back to the article or category list', async () => {
    let wrapper = await mountPage({ categorySlug: 'faq' });
    editor(wrapper).vm.$emit('goBack');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'portals_articles_index',
      params: { tab: 'all', categorySlug: 'faq', locale: 'en' },
    });
    wrapper = await mountPage({
      routeName: 'portals_categories_articles_new',
      categorySlug: 'faq',
    });
    editor(wrapper).vm.$emit('goBack');
    expect(env.router.push).toHaveBeenCalledWith({
      name: 'portals_categories_articles_index',
      params: { categorySlug: 'faq', locale: 'en' },
    });
  });
});
