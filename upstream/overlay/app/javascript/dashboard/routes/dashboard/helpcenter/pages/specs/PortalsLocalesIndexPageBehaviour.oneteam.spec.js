/**
 * OneTeam behaviour spec for the portal locales page.
 *
 * Covers mapping the portal's allowed locales, their count defaults,
 * and an unknown portal.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import PortalsLocalesIndexPage from '../PortalsLocalesIndexPage.vue';

const env = vi.hoisted(() => ({}));

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { portalSlug: 'docs' } }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => computed(() => slug => env.portals[slug]),
}));

/**
 * Mounts the page and returns the locales passed on.
 *
 * @returns {object[]}
 */
const locales = () =>
  mount(PortalsLocalesIndexPage, {
    global: {
      stubs: {
        LocalesPage: {
          name: 'LocalesPage',
          props: ['locales', 'portal'],
          template: '<div />',
        },
      },
    },
  })
    .findComponent({ name: 'LocalesPage' })
    .props('locales');

describe('PortalsLocalesIndexPage behaviour', () => {
  it('maps the allowed locales with count defaults', () => {
    env.portals = {
      docs: {
        config: {
          allowed_locales: [
            { code: 'en', draft: true, articles_count: 3, categories_count: 2 },
            { code: 'fr' },
          ],
        },
      },
    };
    expect(locales()).toEqual([
      {
        id: 'en',
        name: 'English',
        code: 'en',
        isDraft: true,
        articlesCount: 3,
        categoriesCount: 2,
      },
      {
        id: 'fr',
        name: 'French',
        code: 'fr',
        isDraft: false,
        articlesCount: 0,
        categoriesCount: 0,
      },
    ]);
  });

  it('has no locales without a portal', () => {
    env.portals = {};
    expect(locales()).toEqual([]);
  });
});
