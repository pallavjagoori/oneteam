/**
 * OneTeam behaviour spec for the help center article list.
 *
 * The store, route, router and drag list are faked. Covers when drag
 * reordering is allowed, same-page and cross-page reorders, opening
 * articles from the category and article views, selection controls,
 * status changes with analytics, deleting, discarding drafts, the
 * pending-changes popover results, and translation.
 */
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import ArticleList from '../ArticleList.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
  useRouter: () => env.router,
}));
vi.mock('dashboard/composables/store.js', () => ({
  useStore: () => env.store,
  useMapGetter: () => env.categoryById,
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const DragList = {
  name: 'DraggableReorderList',
  props: ['items', 'disabled', 'currentPage', 'totalPages'],
  emits: ['reorder', 'navigatePage', 'dragging'],
  template: `<div>
    <template v-for="item in items" :key="item.id"><slot name="item" :item="item" /></template>
    <div v-for="item in items" :key="'g' + item.id" class="ghost"><slot name="ghost" :item="item" /></div>
  </div>`,
};
const Card = {
  name: 'ArticleCard',
  props: [
    'id',
    'category',
    'views',
    'isSelected',
    'hasPendingChanges',
    'showSelectionControl',
  ],
  emits: [
    'openArticle',
    'articleAction',
    'draftResolved',
    'draftFailed',
    'toggleSelect',
    'hover',
  ],
  template: '<div class="card" />',
};

const articles = [
  {
    id: 1,
    title: 'One',
    status: 'published',
    category: { id: 3 },
    views: 5,
    draftTitle: 'x',
  },
  { id: 2, title: 'Two', status: 'draft', category: { id: 4 } },
];

const mountList = (props = {}) =>
  mount(ArticleList, {
    props: { articles, ...props },
    global: { stubs: { DraggableReorderList: DragList, ArticleCard: Card } },
  });

const cards = wrapper =>
  wrapper.findAllComponents(Card).filter(c => !c.element.closest('.ghost'));
const dragList = wrapper => wrapper.findComponent(DragList);

describe('ArticleList behaviour', () => {
  beforeEach(() => {
    env.route = {
      params: {
        portalSlug: 'docs',
        locale: 'en',
        tab: 'all',
        categorySlug: 'faq',
      },
    };
    env.router = { push: vi.fn() };
    env.store = { dispatch: vi.fn().mockResolvedValue() };
    env.categoryById = ref(id =>
      id === 3 ? { name: 'Billing', icon: '💳' } : undefined
    );
  });

  it('renders cards with categories, views and pending changes', () => {
    const wrapper = mountList({ selectedArticleIds: new Set([2]) });
    const [first, second] = cards(wrapper);
    expect(first.props()).toMatchObject({
      category: { name: 'Billing', icon: '💳' },
      views: 5,
      isSelected: false,
      hasPendingChanges: true,
      showSelectionControl: true,
    });
    expect(second.props()).toMatchObject({
      category: { name: '', icon: '' },
      views: 0,
      isSelected: true,
      hasPendingChanges: false,
    });
    const ghosts = wrapper
      .findAll('.ghost')
      .map(g => g.findComponent(Card).props('views'));
    expect(ghosts).toEqual([5, 0]);
  });

  it('only allows dragging unfiltered category lists', async () => {
    expect(dragList(mountList()).props('disabled')).toBe(true);
    expect(
      dragList(mountList({ isCategoryArticles: true })).props('disabled')
    ).toBe(false);
    expect(
      dragList(
        mountList({ isCategoryArticles: true, isSearching: true })
      ).props('disabled')
    ).toBe(true);
    expect(
      dragList(
        mountList({ isCategoryArticles: true, articles: [articles[0]] })
      ).props('disabled')
    ).toBe(true);
    expect(
      dragList(
        mountList({
          isCategoryArticles: true,
          articles: [articles[0]],
          totalPages: 2,
        })
      ).props('disabled')
    ).toBe(false);
    expect(
      dragList(
        mountList({
          isCategoryArticles: true,
          selectedArticleIds: new Set([1]),
        })
      ).props('disabled')
    ).toBe(true);
  });

  it('shows selection controls on hover', async () => {
    const wrapper = mountList();
    expect(cards(wrapper)[0].props('showSelectionControl')).toBe(false);
    await cards(wrapper)[0].vm.$emit('hover', true);
    expect(cards(wrapper)[0].props('showSelectionControl')).toBe(true);
    expect(cards(wrapper)[1].props('showSelectionControl')).toBe(false);
    await cards(wrapper)[0].vm.$emit('hover', false);
    expect(cards(wrapper)[0].props('showSelectionControl')).toBe(false);
    await cards(wrapper)[0].vm.$emit('toggleSelect', 1);
    expect(wrapper.emitted('toggleSelect')).toEqual([[1]]);
  });

  it('forwards paging and dragging and reorders', async () => {
    const wrapper = mountList({ currentPage: 2 });
    await dragList(wrapper).vm.$emit('navigatePage', 3);
    await dragList(wrapper).vm.$emit('dragging', true);
    expect(wrapper.emitted('navigatePage')).toEqual([[3]]);
    expect(wrapper.emitted('dragging')).toEqual([[true]]);

    dragList(wrapper).vm.$emit('reorder', { 1: 2 });
    await flushPromises();
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/reorder', {
      reorderedGroup: { 1: 2 },
      portalSlug: 'docs',
    });
    expect(wrapper.emitted('navigatePage')).toHaveLength(1);

    dragList(wrapper).vm.$emit('reorder', { 99: 1 });
    await flushPromises();
    expect(wrapper.emitted('navigatePage')[1]).toEqual([2]);

    env.store.dispatch.mockRejectedValueOnce(new Error('no'));
    dragList(wrapper).vm.$emit('reorder', { 1: 1 });
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.REORDER_ARTICLE.API.ERROR_MESSAGE'
    );
  });

  it('opens articles from either view', async () => {
    let wrapper = mountList();
    await cards(wrapper)[0].vm.$emit('openArticle', 1);
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'portals_articles_edit',
      params: { articleSlug: 1, tab: 'all', categorySlug: 'faq', locale: 'en' },
    });
    wrapper = mountList({ isCategoryArticles: true });
    await cards(wrapper)[0].vm.$emit('openArticle', 2);
    expect(env.router.push).toHaveBeenLastCalledWith({
      name: 'portals_categories_articles_edit',
      params: { articleSlug: 2 },
    });
  });

  it('changes status, tracks it and refreshes the meta', async () => {
    const wrapper = mountList();
    const act = async (action, value) => {
      cards(wrapper)[0].vm.$emit('articleAction', { action, value, id: 1 });
      await flushPromises();
    };
    await act('archive', 'archived');
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/update', {
      portalSlug: 'docs',
      articleId: 1,
      status: 2,
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.ARCHIVE_ARTICLE.API.SUCCESS'
    );
    expect(useTrack).toHaveBeenCalledWith(expect.any(String), {
      uiFrom: 'header',
    });
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'articles/updateArticleMeta',
      {
        portalSlug: 'docs',
        locale: 'en',
      }
    );
    expect(env.store.dispatch).toHaveBeenCalledWith('portals/show', {
      portalSlug: 'docs',
      locale: 'en',
    });

    await act('publish', 'published');
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PUBLISH_ARTICLE.API.SUCCESS'
    );
    expect(useTrack).toHaveBeenCalledTimes(2);
    await act('draft', 'draft');
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.DRAFT_ARTICLE.API.SUCCESS'
    );
    expect(useTrack).toHaveBeenCalledTimes(2);
    await act('other', 'unknown');
    expect(useAlert).toHaveBeenLastCalledWith('');

    env.store.dispatch.mockRejectedValueOnce(new Error('Server says no'));
    await act('publish', 'published');
    expect(useAlert).toHaveBeenLastCalledWith('Server says no');
    env.store.dispatch.mockRejectedValueOnce({});
    await act('draft', 'draft');
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.DRAFT_ARTICLE.API.ERROR'
    );
  });

  it('deletes articles and discards drafts', async () => {
    const wrapper = mountList();
    const act = async action => {
      cards(wrapper)[1].vm.$emit('articleAction', { action, id: 2 });
      await flushPromises();
    };
    await act('delete');
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/delete', {
      portalSlug: 'docs',
      articleId: 2,
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.DELETE_ARTICLE.API.SUCCESS_MESSAGE'
    );
    await act('discard-draft');
    expect(env.store.dispatch).toHaveBeenCalledWith('articles/discardDraft', {
      portalSlug: 'docs',
      articleId: 2,
    });
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.DISCARD_CHANGES_SUCCESS'
    );

    env.store.dispatch.mockRejectedValueOnce(undefined);
    await act('delete');
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.DELETE_ARTICLE.API.ERROR_MESSAGE'
    );
    env.store.dispatch.mockRejectedValueOnce({});
    await act('discard-draft');
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.DISCARD_CHANGES_ERROR'
    );
  });

  it('reports pending-change results and translation requests', async () => {
    const wrapper = mountList();
    cards(wrapper)[0].vm.$emit('draftResolved', 1);
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.PUBLISH_ARTICLE.API.SUCCESS'
    );
    expect(env.store.dispatch).toHaveBeenCalledWith(
      'portals/show',
      expect.any(Object)
    );
    await cards(wrapper)[0].vm.$emit('draftFailed', new Error('Conflict'));
    expect(useAlert).toHaveBeenLastCalledWith('Conflict');
    await cards(wrapper)[0].vm.$emit('draftFailed');
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.PUBLISH_CHANGES_ERROR'
    );
    await cards(wrapper)[0].vm.$emit('articleAction', {
      action: 'translate',
      id: 1,
    });
    expect(wrapper.emitted('translateArticle')).toEqual([[1]]);
  });

  it('defaults to no selection', () => {
    const wrapper = mount(ArticleList, {
      props: { articles: [] },
      global: { stubs: { DraggableReorderList: { template: '<div />' } } },
    });
    expect(wrapper.exists()).toBe(true);
  });
});
