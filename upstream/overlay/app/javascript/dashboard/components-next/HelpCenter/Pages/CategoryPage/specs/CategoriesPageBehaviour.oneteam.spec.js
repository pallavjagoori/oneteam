/**
 * OneTeam behaviour spec for the help center categories page.
 *
 * Covers the loading spinner (fetching or switching portals), listing and
 * searching categories (search disables dragging), both empty states,
 * opening a category's articles, changing locale, editing, deleting (with
 * tracking and both failure messages), and reordering failures.
 */
import { computed } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { useAlert, useTrack } from 'dashboard/composables';
import CategoriesPage from '../CategoriesPage.vue';

const env = vi.hoisted(() => ({
  state: {},
  push: null,
  dispatch: null,
  log: [],
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { accountId: 1, portalSlug: 'docs', locale: 'en' },
  }),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name => computed(() => env.state[name]),
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));

const CategoryList = {
  name: 'CategoryList',
  props: ['categories', 'disableDrag'],
  emits: ['click', 'action', 'reorder'],
  template:
    '<ul class="list"><li v-for="c in categories" :key="c.id">{{ c.name }}</li></ul>',
};
const Controls = {
  name: 'CategoryHeaderControls',
  props: ['searchQuery'],
  emits: ['update:searchQuery', 'localeChange'],
  template: '<div class="controls" />',
};
const EmptyState = {
  name: 'CategoryEmptyState',
  props: ['title'],
  template: '<p class="empty">{{ title }}</p>',
};
const EditCategoryDialog = {
  name: 'EditCategoryDialog',
  props: ['selectedCategory'],
  data: () => ({ dialogRef: { open: () => env.log.push('edit open') } }),
  template: '<div class="edit" />',
};

const categories = [
  { id: 1, name: 'Billing', meta: { articles_count: 3 } },
  { id: 2, name: 'Getting started' },
  { id: 3 },
];

const mountPage = (props = {}) =>
  mount(CategoriesPage, {
    props: { categories, allowedLocales: [{ code: 'en' }], ...props },
    global: {
      stubs: {
        HelpCenterLayout: {
          template:
            '<div><slot name="header-actions" /><slot name="content" /><slot /></div>',
        },
        CategoryList,
        CategoryHeaderControls: Controls,
        CategoryEmptyState: EmptyState,
        EditCategoryDialog,
        Spinner: { template: '<div class="spinner" />' },
      },
    },
  });
const list = wrapper => wrapper.findComponent(CategoryList);
const search = (wrapper, value) =>
  wrapper.findComponent(Controls).vm.$emit('update:searchQuery', value);

describe('CategoriesPage behaviour', () => {
  beforeEach(() => {
    env.state = { 'portals/isSwitchingPortal': false };
    env.push = vi.fn();
    env.dispatch = vi.fn();
    env.log = [];
  });

  it('shows a spinner while fetching or switching portals', () => {
    expect(mountPage({ isFetching: true }).find('.spinner').exists()).toBe(
      true
    );
    env.state['portals/isSwitchingPortal'] = true;
    expect(mountPage().find('.spinner').exists()).toBe(true);
  });

  it('lists and searches categories', async () => {
    const wrapper = mountPage();
    expect(list(wrapper).props('disableDrag')).toBe(false);
    await search(wrapper, '  BILL ');
    expect(list(wrapper).props('categories')).toEqual([categories[0]]);
    expect(list(wrapper).props('disableDrag')).toBe(true);
    await search(wrapper, 'nothing');
    expect(wrapper.find('.empty').text()).toBe(
      'HELP_CENTER.CATEGORY_PAGE.SEARCH_EMPTY_STATE.TITLE'
    );
    await search(wrapper, '   ');
    expect(list(wrapper).props('categories')).toHaveLength(3);
  });

  it('shows the empty state without categories', () => {
    expect(mountPage({ categories: [] }).find('.empty').text()).toBe(
      'HELP_CENTER.CATEGORY_PAGE.CATEGORY_EMPTY_STATE.TITLE'
    );
  });

  it('opens category articles and changes locale', async () => {
    const wrapper = mountPage();
    await list(wrapper).vm.$emit('click', 'billing');
    expect(env.push).toHaveBeenCalledWith({
      name: 'portals_categories_articles_index',
      params: {
        accountId: 1,
        portalSlug: 'docs',
        locale: 'en',
        categorySlug: 'billing',
      },
    });
    await wrapper.findComponent(Controls).vm.$emit('localeChange', 'fr');
    expect(env.push).toHaveBeenLastCalledWith({
      name: 'portals_categories_index',
      params: {
        accountId: 1,
        portalSlug: 'docs',
        locale: 'fr',
        categorySlug: undefined,
      },
    });
    expect(wrapper.emitted('fetchCategories')).toEqual([['fr']]);
  });

  it('edits a category', async () => {
    const wrapper = mountPage();
    await list(wrapper).vm.$emit('action', { action: 'edit', id: 2 });
    expect(
      wrapper.findComponent(EditCategoryDialog).props('selectedCategory')
    ).toEqual(categories[1]);
    expect(env.log).toEqual(['edit open']);
    await list(wrapper).vm.$emit('action', { action: 'archive', id: 2 });
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('deletes categories and tracks whether they had articles', async () => {
    const wrapper = mountPage();
    await list(wrapper).vm.$emit('action', {
      action: 'delete',
      id: 1,
      category: categories[0],
    });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('categories/delete', {
      portalSlug: 'docs',
      categoryId: 1,
    });
    expect(useTrack.mock.calls[0][1]).toEqual({ hasArticles: true });
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.DELETE.API.SUCCESS_MESSAGE'
    );
    await list(wrapper).vm.$emit('action', {
      action: 'delete',
      id: 2,
      category: categories[1],
    });
    await flushPromises();
    expect(useTrack.mock.calls[1][1]).toEqual({ hasArticles: false });
  });

  it('alerts when deleting fails', async () => {
    const wrapper = mountPage();
    env.dispatch.mockRejectedValueOnce(new Error('In use'));
    await list(wrapper).vm.$emit('action', {
      action: 'delete',
      id: 1,
      category: categories[0],
    });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith('In use');
    env.dispatch.mockRejectedValueOnce({});
    await list(wrapper).vm.$emit('action', {
      action: 'delete',
      id: 1,
      category: categories[0],
    });
    await flushPromises();
    expect(useAlert).toHaveBeenLastCalledWith(
      'HELP_CENTER.CATEGORY_PAGE.CATEGORY_DIALOG.DELETE.API.ERROR_MESSAGE'
    );
  });

  it('reorders categories and alerts on failure', async () => {
    const wrapper = mountPage();
    await list(wrapper).vm.$emit('reorder', { 1: 2 });
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('categories/reorder', {
      portalSlug: 'docs',
      reorderedGroup: { 1: 2 },
    });
    expect(useAlert).not.toHaveBeenCalled();
    env.dispatch.mockRejectedValueOnce(new Error('x'));
    await list(wrapper).vm.$emit('reorder', {});
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith(
      'HELP_CENTER.REORDER_CATEGORY.API.ERROR_MESSAGE'
    );
  });
});
