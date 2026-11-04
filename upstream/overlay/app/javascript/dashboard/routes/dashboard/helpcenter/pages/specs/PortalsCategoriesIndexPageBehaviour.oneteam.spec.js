/**
 * OneTeam behaviour spec for the help center categories index page.
 *
 * Covers fetching categories for the route locale, building the allowed
 * locales from the portal, the missing portal case, and refetching
 * categories and portal meta for another locale.
 */
import { mount, flushPromises } from '@vue/test-utils';
import { computed } from 'vue';
import PortalsCategoriesIndexPage from '../PortalsCategoriesIndexPage.vue';

const env = vi.hoisted(() => ({ dispatch: vi.fn(), portal: null }));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { portalSlug: 'docs', locale: 'en' } }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
  useMapGetter: key =>
    computed(
      () =>
        ({
          'categories/allCategoriesSortedByPosition': [{ id: 1 }],
          'categories/isFetching': false,
          'portals/portalBySlug': slug => (slug === 'docs' ? env.portal : null),
        })[key]
    ),
}));

/**
 * Mounts the page.
 *
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountPage = () =>
  mount(PortalsCategoriesIndexPage, {
    global: {
      stubs: {
        CategoriesPage: {
          name: 'CategoriesPage',
          props: ['categories', 'isFetching', 'allowedLocales'],
          emits: ['fetchCategories'],
          template: '<div />',
        },
      },
    },
  });

describe('PortalsCategoriesIndexPage behaviour', () => {
  it('fetches categories and refetches for another locale', async () => {
    env.portal = {
      config: { allowed_locales: [{ code: 'en' }, { code: 'fr' }] },
    };
    const wrapper = mountPage();
    expect(env.dispatch).toHaveBeenCalledWith('categories/index', {
      portalSlug: 'docs',
      locale: 'en',
    });
    const page = wrapper.findComponent({ name: 'CategoriesPage' });
    expect(page.props('allowedLocales')).toEqual([
      { id: 'en', name: 'English', code: 'en' },
      { id: 'fr', name: 'French', code: 'fr' },
    ]);
    page.vm.$emit('fetchCategories', 'fr');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('categories/index', {
      portalSlug: 'docs',
      locale: 'fr',
    });
    expect(env.dispatch).toHaveBeenLastCalledWith('portals/show', {
      portalSlug: 'docs',
      locale: 'fr',
    });
  });

  it('offers no locales without a portal', () => {
    env.portal = null;
    const wrapper = mountPage();
    expect(
      wrapper.findComponent({ name: 'CategoriesPage' }).props('allowedLocales')
    ).toEqual([]);
  });
});
