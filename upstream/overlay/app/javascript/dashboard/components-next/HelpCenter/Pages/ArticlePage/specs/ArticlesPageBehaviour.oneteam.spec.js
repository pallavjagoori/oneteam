/**
 * OneTeam behaviour spec for the help center articles page.
 *
 * Covers the header controls (tabs, locale, category, new article), the
 * debounced search, loading and empty states, article selection and the
 * bulk actions (status changes with pending drafts, moving to a category,
 * translating and deleting).
 */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import ArticlesPage from '../ArticlesPage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({
    t: (key, arg) =>
      arg === undefined ? key : `${key}:${JSON.stringify(arg)}`,
  }),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store.js', async () => {
  const { computed } = await import('vue');
  const getters = {
    'portals/isSwitchingPortal': () => env.state.switching,
    'articles/isFetching': () => env.state.fetching,
    getCurrentAccountId: () => 1,
    'accounts/isFeatureEnabledonAccount': () => (id, flag) =>
      env.state.features.includes(`${id}:${flag}`),
  };
  return {
    useMapGetter: key => computed(getters[key]),
    useStore: () => env.store,
  };
});
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({ isEnterprise: env.enterprise }),
}));
vi.mock('@chatwoot/utils', async importOriginal => ({
  ...(await importOriginal()),
  debounce: fn => fn,
}));
vi.mock('dashboard/helper/articleDiffHelper', () => ({
  hasPendingChanges: article => Boolean(article.pending),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/helpCenter/articles', () => ({
  default: {
    bulkUpdateStatus: vi.fn(async () => {}),
    bulkUpdateCategory: vi.fn(async () => {}),
    bulkDelete: vi.fn(async () => {}),
  },
}));

const { useAlert } = await import('dashboard/composables');
const { default: articlesAPI } = await import(
  'dashboard/api/helpCenter/articles'
);

const B = 'HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS';

const Layout = {
  name: 'HelpCenterLayout',
  props: [
    'currentPage',
    'totalItems',
    'itemsPerPage',
    'header',
    'breadcrumbLabel',
    'showPaginationFooter',
  ],
  emits: ['update:currentPage'],
  template:
    '<div><slot name="title-actions" /><slot name="header-actions" /><slot name="content" /><slot /></div>',
};
const ButtonStub = {
  name: 'Button',
  props: ['label', 'icon'],
  emits: ['click'],
  template:
    '<button :data-label="label" @click="$emit(\'click\')">{{ label }}</button>',
};
const InputStub = {
  name: 'Input',
  props: ['modelValue', 'size', 'type', 'placeholder'],
  emits: ['update:modelValue', 'input'],
  template:
    '<input class="search" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'input\', $event)" />',
};
const passthrough = name => ({
  name,
  props: [
    'categories',
    'allowedLocales',
    'meta',
    'hasSelectedCategory',
    'articles',
    'isCategoryArticles',
    'isSearching',
    'selectedArticleIds',
    'currentPage',
    'totalPages',
    'title',
    'subtitle',
    'showButton',
    'buttonLabel',
    'allItems',
    'selectAllLabel',
    'selectedCountLabel',
    'modelValue',
    'menuItems',
  ],
  template: `<div class="${name}"><slot name="secondaryActions" /><slot name="actions" /><slot /></div>`,
});

const mountPage = (props = {}) =>
  mount(ArticlesPage, {
    props: {
      articles: [
        { id: 1, status: 'published' },
        { id: 2, status: 'draft' },
      ],
      categories: [{ id: 7, name: 'Billing', icon: '💳', icon_color: 'red' }],
      allowedLocales: [{ code: 'en' }],
      portalName: 'Docs',
      meta: {
        currentPage: '2',
        allArticlesCount: 3,
        articlesCount: 60,
        mineArticlesCount: 4,
        draftArticlesCount: 0,
        archivedArticlesCount: 1,
      },
      ...props,
    },
    global: {
      stubs: {
        HelpCenterLayout: Layout,
        Button: ButtonStub,
        Input: InputStub,
        ArticleHeaderControls: passthrough('ArticleHeaderControls'),
        CategoryHeaderControls: passthrough('CategoryHeaderControls'),
        ArticleList: passthrough('ArticleList'),
        ArticleEmptyState: passthrough('ArticleEmptyState'),
        BulkSelectBar: passthrough('BulkSelectBar'),
        DropdownMenu: passthrough('DropdownMenu'),
        Spinner: { name: 'Spinner', template: '<i class="spinner" />' },
        OnClickOutside: {
          name: 'OnClickOutside',
          emits: ['trigger'],
          template: '<div class="outside"><slot /></div>',
        },
        BulkTranslateDialog: {
          name: 'BulkTranslateDialog',
          props: ['selectedArticleIds', 'allowedLocales'],
          emits: ['translateStarted'],
          data: () => ({ dialogRef: { open: env.translateOpen } }),
          template: '<div />',
        },
        Dialog: {
          name: 'Dialog',
          props: ['title', 'description', 'confirmButtonLabel', 'type'],
          emits: ['confirm'],
          methods: {
            open: (...a) => env.dialog.open(...a),
            close: (...a) => env.dialog.close(...a),
          },
          template: '<div class="dialog" />',
        },
      },
    },
  });

const list = wrapper => wrapper.findComponent({ name: 'ArticleList' });
const btn = (wrapper, key) => wrapper.find(`button[data-label="${B}.${key}"]`);
const select = async (wrapper, ...ids) => {
  ids.forEach(id => list(wrapper).vm.$emit('toggleSelect', id));
  await flushPromises();
};

describe('ArticlesPage behaviour', () => {
  beforeEach(() => {
    env.route = reactive({
      params: { portalSlug: 'docs', locale: 'en', tab: '', categorySlug: '' },
      query: { search: 'pay' },
    });
    env.router = { push: vi.fn() };
    env.store = { dispatch: vi.fn(async () => {}) };
    env.state = reactive({ switching: false, fetching: false, features: [] });
    env.enterprise = false;
    env.translateOpen = vi.fn();
    env.dialog = { open: vi.fn(), close: vi.fn() };
  });

  it('passes pagination info to the layout and list', async () => {
    const wrapper = mountPage();
    const layout = wrapper.findComponent(Layout);
    expect(layout.props()).toMatchObject({
      currentPage: 2,
      totalItems: 60,
      header: 'Docs',
      showPaginationFooter: true,
    });
    expect(list(wrapper).props()).toMatchObject({
      totalPages: 3,
      isSearching: true,
      isCategoryArticles: false,
    });
    expect(wrapper.find('.search').element.value).toBe('pay');

    layout.vm.$emit('update:currentPage', 3);
    list(wrapper).vm.$emit('navigatePage', 4);
    expect(wrapper.emitted('pageChange')).toEqual([[3], [4]]);
  });

  it.each([
    ['mine', 4, 1],
    ['draft', 60, 3],
    ['archived', 1, 1],
    [undefined, 60, 3],
  ])('counts the %s tab', (tab, total, pages) => {
    env.route.params.tab = tab;
    const wrapper = mountPage();
    expect(wrapper.findComponent(Layout).props('totalItems')).toBe(total);
    expect(list(wrapper).props('totalPages')).toBe(pages);
  });

  it('falls back to a single page when there are no articles counted', () => {
    const wrapper = mountPage({
      meta: { currentPage: 1, articlesCount: 0 },
    });
    expect(list(wrapper).props('totalPages')).toBe(1);
  });

  it('emits a search on input', async () => {
    env.route.query = {};
    const wrapper = mountPage();
    expect(wrapper.find('.search').element.value).toBe('');
    await wrapper.find('.search').setValue('refund');
    expect(wrapper.emitted('search')).toEqual([['refund']]);
  });

  it('routes the header control events', async () => {
    env.route.params = {
      portalSlug: 'docs',
      locale: 'en',
      tab: 'mine',
      categorySlug: 'billing',
    };
    const wrapper = mountPage();
    const header = wrapper.findComponent({ name: 'ArticleHeaderControls' });
    const query = env.route.query;

    header.vm.$emit('tabChange', { value: 'all' });
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'portals_articles_index',
      params: {
        portalSlug: 'docs',
        locale: 'en',
        tab: '',
        categorySlug: 'billing',
      },
      query,
    });
    header.vm.$emit('tabChange', { value: 'draft' });
    expect(env.router.push.mock.lastCall[0].params.tab).toBe('draft');

    header.vm.$emit('categoryChange', 'all');
    expect(env.router.push.mock.lastCall[0].params).toMatchObject({
      tab: 'mine',
      categorySlug: '',
    });
    header.vm.$emit('categoryChange', 'faq');
    expect(env.router.push.mock.lastCall[0].params.categorySlug).toBe('faq');

    header.vm.$emit('localeChange', 'fr');
    expect(env.router.push.mock.lastCall[0].params).toMatchObject({
      locale: 'fr',
      categorySlug: '',
    });
    expect(wrapper.emitted('fetchPortal')).toEqual([['fr']]);

    header.vm.$emit('newArticle');
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'portals_articles_new',
      params: { categorySlug: 'billing', locale: 'en' },
    });
  });

  it('shows category controls for category articles', () => {
    const wrapper = mountPage({ isCategoryArticles: true });
    expect(
      wrapper.findComponent({ name: 'ArticleHeaderControls' }).exists()
    ).toBe(false);
    const header = wrapper.findComponent({ name: 'CategoryHeaderControls' });
    expect(header.props('hasSelectedCategory')).toBe(true);
    header.vm.$emit('newArticle');
    expect(env.router.push.mock.lastCall[0].name).toBe(
      'portals_categories_articles_new'
    );
  });

  it('hides search and header controls while switching portals', () => {
    env.state.switching = true;
    const wrapper = mountPage();
    expect(wrapper.find('.search').exists()).toBe(false);
    expect(
      wrapper.findComponent({ name: 'ArticleHeaderControls' }).exists()
    ).toBe(false);
    expect(
      wrapper.findComponent({ name: 'CategoryHeaderControls' }).exists()
    ).toBe(false);
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.findComponent(Layout).props('showPaginationFooter')).toBe(
      false
    );
  });

  it('keeps the list visible while dragging during a fetch', async () => {
    const wrapper = mountPage();
    list(wrapper).vm.$emit('dragging', true);
    env.state.fetching = true;
    await flushPromises();
    expect(wrapper.find('.spinner').exists()).toBe(false);
    expect(list(wrapper).exists()).toBe(true);
    list(wrapper).vm.$emit('dragging', false);
    await flushPromises();
    expect(wrapper.find('.spinner').exists()).toBe(true);
  });

  it.each([
    [{ tab: '', search: 'x' }, false, 'SEARCH', false],
    [{ tab: '', search: '' }, true, 'CATEGORY', false],
    [{ tab: 'draft', search: '' }, false, 'DRAFT', true],
    [{ tab: undefined, search: '' }, false, 'ALL', true],
  ])(
    'empty state copy for %o (category %s)',
    (state, isCategoryArticles, key, showButton) => {
      env.route.params.tab = state.tab;
      env.route.query = { search: state.search };
      const wrapper = mountPage({
        articles: [],
        isCategoryArticles,
        meta: { currentPage: 1, allArticlesCount: 0 },
      });
      const empty = wrapper.findComponent({ name: 'ArticleEmptyState' });
      expect(empty.props('title')).toBe(
        `HELP_CENTER.ARTICLES_PAGE.EMPTY_STATE.${key}.TITLE`
      );
      expect(empty.props('subtitle')).toBe(
        `HELP_CENTER.ARTICLES_PAGE.EMPTY_STATE.${key}.SUBTITLE`
      );
      expect(empty.props('showButton')).toBe(showButton);
      empty.vm.$emit('click');
      expect(env.router.push).toHaveBeenCalled();
    }
  );

  it('selects and clears articles, and clears when the list changes', async () => {
    const wrapper = mountPage();
    expect(wrapper.findComponent({ name: 'BulkSelectBar' }).exists()).toBe(
      false
    );
    await select(wrapper, 1, 2, 2);
    const bar = wrapper.findComponent({ name: 'BulkSelectBar' });
    expect([...bar.props('modelValue')]).toEqual([1]);
    expect(bar.props('allItems')).toEqual([{ id: 1 }, { id: 2 }]);
    expect(bar.props('selectAllLabel')).toBe(
      'HELP_CENTER.ARTICLES_PAGE.BULK_TRANSLATE.SELECT_ALL:{"count":2}'
    );
    expect(bar.props('selectedCountLabel')).toBe(
      'HELP_CENTER.ARTICLES_PAGE.BULK_TRANSLATE.SELECTED_COUNT:{"count":1}'
    );
    bar.vm.$emit('update:modelValue', new Set([1, 2]));
    await flushPromises();
    expect(
      wrapper.findComponent({ name: 'BulkTranslateDialog' }).props()
        .selectedArticleIds
    ).toEqual([1, 2]);

    await wrapper
      .find(
        'button[data-label="HELP_CENTER.ARTICLES_PAGE.BULK_TRANSLATE.CLEAR_SELECTION"]'
      )
      .trigger('click');
    expect(wrapper.findComponent({ name: 'BulkSelectBar' }).exists()).toBe(
      false
    );

    await select(wrapper, 1);
    await wrapper.setProps({ articles: [{ id: 3, status: 'draft' }] });
    expect(list(wrapper).props('selectedArticleIds').size).toBe(0);
  });

  it('opens the translate dialog from a card and from the bulk bar', async () => {
    env.enterprise = true;
    env.state.features = ['1:captain_tasks'];
    const wrapper = mountPage();
    list(wrapper).vm.$emit('translateArticle', 2);
    await flushPromises();
    expect(env.translateOpen).toHaveBeenCalledTimes(1);
    expect([...list(wrapper).props('selectedArticleIds')]).toEqual([2]);
    await btn(wrapper, 'TRANSLATE').trigger('click');
    expect(env.translateOpen).toHaveBeenCalledTimes(2);

    wrapper
      .findComponent({ name: 'BulkTranslateDialog' })
      .vm.$emit('translateStarted');
    await flushPromises();
    expect(list(wrapper).props('selectedArticleIds').size).toBe(0);
  });

  it('hides translate without the captain tasks feature', async () => {
    env.enterprise = true;
    const wrapper = mountPage();
    await select(wrapper, 1);
    expect(btn(wrapper, 'TRANSLATE').exists()).toBe(false);
  });

  it('tolerates a translate dialog without its inner dialog', async () => {
    env.translateOpen = undefined;
    const wrapper = mountPage();
    wrapper.findComponent({ name: 'BulkTranslateDialog' }).vm.dialogRef =
      undefined;
    list(wrapper).vm.$emit('translateArticle', 1);
    await flushPromises();
    expect([...list(wrapper).props('selectedArticleIds')]).toEqual([1]);
  });

  describe('bulk status', () => {
    const articles = [
      { id: 1, status: 'published', pending: true },
      { id: 2, status: 'draft', pending: true },
      { id: 3, status: 'published' },
    ];

    it('publishes plain articles and promotes pending drafts', async () => {
      const wrapper = mountPage({ articles });
      await select(wrapper, 1, 2, 3);
      await btn(wrapper, 'PUBLISH').trigger('click');
      await flushPromises();
      expect(articlesAPI.bulkUpdateStatus).toHaveBeenCalledWith({
        portalSlug: 'docs',
        articleIds: [2, 3],
        status: 'published',
      });
      expect(env.store.dispatch).toHaveBeenCalledWith('articles/publishDraft', {
        portalSlug: 'docs',
        articleId: 1,
      });
      expect(useAlert).toHaveBeenCalledWith(`${B}.STATUS_SUCCESS`);
      expect(useAlert).toHaveBeenCalledTimes(1);
      expect(wrapper.emitted('refreshArticles')).toHaveLength(1);
    });

    it('only promotes drafts when every selection is pending', async () => {
      const wrapper = mountPage({ articles });
      await select(wrapper, 1);
      await btn(wrapper, 'PUBLISH').trigger('click');
      await flushPromises();
      expect(articlesAPI.bulkUpdateStatus).not.toHaveBeenCalled();
      expect(env.store.dispatch).toHaveBeenCalledTimes(1);
    });

    it('skips pending articles for other statuses and says so', async () => {
      const wrapper = mountPage({ articles });
      await select(wrapper, 1, 3);
      await btn(wrapper, 'DRAFT').trigger('click');
      await flushPromises();
      expect(articlesAPI.bulkUpdateStatus).toHaveBeenCalledWith({
        portalSlug: 'docs',
        articleIds: [3],
        status: 'draft',
      });
      expect(env.store.dispatch).not.toHaveBeenCalled();
      expect(useAlert).toHaveBeenLastCalledWith(`${B}.STATUS_SKIPPED:1`);
    });

    it('warns when everything selected is skipped', async () => {
      const wrapper = mountPage({ articles });
      await select(wrapper, 1);
      await btn(wrapper, 'ARCHIVE').trigger('click');
      await flushPromises();
      expect(articlesAPI.bulkUpdateStatus).not.toHaveBeenCalled();
      expect(useAlert).toHaveBeenCalledWith(`${B}.STATUS_SKIPPED_ALL`);
    });

    it('reports failures', async () => {
      const wrapper = mountPage({ articles });
      await select(wrapper, 3);
      articlesAPI.bulkUpdateStatus.mockRejectedValueOnce(new Error('boom'));
      await btn(wrapper, 'ARCHIVE').trigger('click');
      await flushPromises();
      expect(useAlert).toHaveBeenLastCalledWith('boom');
      articlesAPI.bulkUpdateStatus.mockRejectedValueOnce(null);
      await btn(wrapper, 'ARCHIVE').trigger('click');
      await flushPromises();
      expect(useAlert).toHaveBeenLastCalledWith(`${B}.STATUS_ERROR`);
      expect(wrapper.emitted('refreshArticles')).toBeUndefined();
    });
  });

  it('moves selected articles to a category', async () => {
    const wrapper = mountPage();
    await select(wrapper, 1);
    expect(wrapper.findComponent({ name: 'DropdownMenu' }).exists()).toBe(
      false
    );
    await btn(wrapper, 'MOVE_TO_CATEGORY').trigger('click');
    const menu = wrapper.findComponent({ name: 'DropdownMenu' });
    expect(menu.props('menuItems')).toEqual([
      {
        label: 'Billing',
        value: 7,
        action: 'move',
        emoji: '💳',
        iconColor: 'red',
      },
    ]);
    await btn(wrapper, 'MOVE_TO_CATEGORY').trigger('click');
    expect(wrapper.findComponent({ name: 'DropdownMenu' }).exists()).toBe(
      false
    );
    await btn(wrapper, 'MOVE_TO_CATEGORY').trigger('click');
    wrapper.findComponent({ name: 'OnClickOutside' }).vm.$emit('trigger');
    await flushPromises();
    expect(wrapper.findComponent({ name: 'DropdownMenu' }).exists()).toBe(
      false
    );

    await btn(wrapper, 'MOVE_TO_CATEGORY').trigger('click');
    wrapper
      .findComponent({ name: 'DropdownMenu' })
      .vm.$emit('action', { value: 7 });
    await flushPromises();
    expect(articlesAPI.bulkUpdateCategory).toHaveBeenCalledWith({
      portalSlug: 'docs',
      articleIds: [1],
      categoryId: 7,
    });
    expect(useAlert).toHaveBeenCalledWith(`${B}.CATEGORY_SUCCESS`);
    expect(wrapper.findComponent({ name: 'DropdownMenu' }).exists()).toBe(
      false
    );
  });

  it('reports category move failures', async () => {
    const wrapper = mountPage();
    await select(wrapper, 1);
    await btn(wrapper, 'MOVE_TO_CATEGORY').trigger('click');
    articlesAPI.bulkUpdateCategory.mockRejectedValueOnce(new Error('nope'));
    wrapper
      .findComponent({ name: 'DropdownMenu' })
      .vm.$emit('action', { value: 7 });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('nope');

    await btn(wrapper, 'MOVE_TO_CATEGORY').trigger('click');
    articlesAPI.bulkUpdateCategory.mockRejectedValueOnce(undefined);
    wrapper
      .findComponent({ name: 'DropdownMenu' })
      .vm.$emit('action', { value: 7 });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(`${B}.CATEGORY_ERROR`);
  });

  it('hides the category menu when there are no categories', async () => {
    const wrapper = mountPage({ categories: [] });
    await select(wrapper, 1);
    expect(btn(wrapper, 'MOVE_TO_CATEGORY').exists()).toBe(false);
  });

  it('confirms and runs bulk delete', async () => {
    const wrapper = mountPage();
    await select(wrapper, 1, 2);
    const dialog = wrapper.findComponent({ name: 'Dialog' });
    expect(dialog.props('title')).toBe(`${B}.DELETE_CONFIRM_TITLE:2`);
    await btn(wrapper, 'DELETE').trigger('click');
    expect(env.dialog.open).toHaveBeenCalled();

    dialog.vm.$emit('confirm');
    await flushPromises();
    expect(articlesAPI.bulkDelete).toHaveBeenCalledWith({
      portalSlug: 'docs',
      articleIds: [1, 2],
    });
    expect(env.dialog.close).toHaveBeenCalledTimes(1);
    expect(useAlert).toHaveBeenCalledWith(`${B}.DELETE_SUCCESS`);

    articlesAPI.bulkDelete.mockRejectedValueOnce(new Error('locked'));
    dialog.vm.$emit('confirm');
    await flushPromises();
    expect(env.dialog.close).toHaveBeenCalledTimes(2);
    expect(useAlert).toHaveBeenLastCalledWith('locked');

    articlesAPI.bulkDelete.mockRejectedValueOnce(undefined);
    dialog.vm.$emit('confirm');
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(`${B}.DELETE_ERROR`);
  });
});
