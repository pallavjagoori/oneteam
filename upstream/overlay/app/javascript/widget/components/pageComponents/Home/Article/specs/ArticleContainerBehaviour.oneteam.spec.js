/**
 * OneTeam behaviour spec for the widget home "popular articles" card.
 *
 * Covers fetching articles for the matching portal locale on mount and
 * when the locale changes, opening an article or the whole help center
 * in the article viewer (light and dark), the skeleton while loading,
 * and hiding the card without a portal, locale or articles.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import ArticleContainer from '../ArticleContainer.vue';

const env = vi.hoisted(() => ({
  dispatch: vi.fn(),
  push: vi.fn(),
  getters: {},
  locale: null,
  dark: null,
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: env.dispatch }),
  useMapGetter: key => env.getters[key],
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: env.push }),
}));
vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ locale: env.locale }),
}));
vi.mock('widget/composables/useDarkMode', () => ({
  useDarkMode: () => ({ prefersDarkMode: env.dark }),
}));

const ArticleBlock = {
  name: 'ArticleBlock',
  props: ['articles'],
  emits: ['view', 'viewAll'],
  template: '<div class="block" />',
};
const SkeletonLoader = {
  name: 'ArticleCardSkeletonLoader',
  template: '<div class="skeleton" />',
};

/**
 * Sets up the portal, store state and locale, then mounts the card.
 *
 * @param {object} options Portal, articles, ui flags and locale.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = ({
  portal = { slug: 'docs', config: { allowed_locales: ['en', 'fr'] } },
  articles = [{ id: 1 }],
  uiFlags = { isFetching: false, isError: false },
  locale = 'en',
} = {}) => {
  window.chatwootWebChannel = { portal };
  env.getters = {
    'article/popularArticles': ref(articles),
    'article/uiFlags': ref(uiFlags),
  };
  env.locale = ref(locale);
  return mount(ArticleContainer, {
    global: {
      stubs: { ArticleBlock, ArticleCardSkeletonLoader: SkeletonLoader },
    },
  });
};

describe('ArticleContainer behaviour', () => {
  beforeEach(() => {
    env.dispatch = vi.fn();
    env.push = vi.fn();
    env.dark = ref(false);
  });

  afterAll(() => {
    delete window.chatwootWebChannel;
  });

  it('fetches articles on mount and when the locale changes', async () => {
    mountCard();
    expect(env.dispatch).toHaveBeenCalledWith('article/fetch', {
      slug: 'docs',
      locale: 'en',
    });
    env.locale.value = 'fr';
    await flushPromises();
    expect(env.dispatch).toHaveBeenLastCalledWith('article/fetch', {
      slug: 'docs',
      locale: 'fr',
    });
  });

  it('skips refetching when the matched locale stays the same', async () => {
    mountCard();
    env.dispatch.mockClear();
    env.locale.value = 'de';
    await flushPromises();
    expect(env.dispatch).not.toHaveBeenCalled();
  });

  it('opens an article and the whole help center in the viewer', async () => {
    const wrapper = mountCard();
    const block = wrapper.getComponent(ArticleBlock);
    block.vm.$emit('view', '/hc/docs/articles/1');
    let link = env.push.mock.calls[0][0].query.link;
    expect(env.push.mock.calls[0][0].name).toBe('article-viewer');
    expect(link).toBe(
      '/hc/docs/articles/1?show_plain_layout=true&theme=light&locale=en'
    );
    env.dark.value = true;
    block.vm.$emit('viewAll');
    link = env.push.mock.calls[1][0].query.link;
    expect(link).toBe(
      '/hc/docs/en?show_plain_layout=true&theme=dark&locale=en'
    );
  });

  it('omits the locale from the viewer link when none matches', () => {
    const wrapper = mountCard({ portal: { slug: 'docs' } });
    expect(env.dispatch).not.toHaveBeenCalled();
    expect(wrapper.findComponent(ArticleBlock).exists()).toBe(false);
    wrapper.vm.$.setupState.openArticleInArticleViewer('/a');
    expect(env.push.mock.calls[0][0].query.link).toBe(
      '/a?show_plain_layout=true&theme=light'
    );
  });

  it('shows the skeleton while loading and hides errors', () => {
    const loading = mountCard({
      articles: [],
      uiFlags: { isFetching: true, isError: false },
    });
    expect(loading.find('.skeleton').exists()).toBe(true);
    expect(loading.findComponent(ArticleBlock).exists()).toBe(false);
    const failed = mountCard({ uiFlags: { isFetching: false, isError: true } });
    expect(failed.findComponent(ArticleBlock).exists()).toBe(false);
  });

  it('hides the card without a portal or articles', () => {
    expect(mountCard({ portal: null }).find('.hidden').exists()).toBe(true);
    expect(mountCard({ articles: [] }).find('.hidden').exists()).toBe(true);
  });
});
