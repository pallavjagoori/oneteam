/**
 * OneTeam behaviour spec for the help center "popular content" dialog.
 *
 * The APIs, store and dialog are faked. Covers opening for a locale with
 * its saved picks, loading categories (ignoring a stale locale) and
 * articles (resolving saved articles missing from the results), article
 * search, saving or clearing the locale entry, and error alerts.
 */
import { mount, flushPromises } from '@vue/test-utils';
import PopularContentDialog from '../PopularContentDialog.vue';

const env = vi.hoisted(() => ({}));

vi.mock('@vueuse/core', async importOriginal => ({
  ...(await importOriginal()),
  useDebounceFn: fn => fn,
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => env.alert(...args),
}));
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: (...args) => env.dispatch(...args) }),
}));
vi.mock('dashboard/api/helpCenter/categories', () => ({
  default: { get: (...args) => env.getCategories(...args) },
}));
vi.mock('dashboard/api/helpCenter/articles', () => ({
  default: {
    getArticles: (...args) => env.getArticles(...args),
    getArticle: (...args) => env.getArticle(...args),
  },
}));

const Dialog = {
  name: 'Dialog',
  emits: ['confirm'],
  methods: {
    open: () => env.open(),
    close: () => env.close(),
  },
  template: '<div><slot /></div>',
};
const Picker = {
  name: 'ReorderableMultiSelect',
  props: ['modelValue', 'options', 'max', 'loading', 'serverSearch'],
  emits: ['update:modelValue', 'search'],
  template:
    '<div class="picker"><slot name="counter" :remaining="2" /><slot name="note" /></div>',
};

const KEY = 'HELP_CENTER.LOCALES_PAGE.POPULAR_CONTENT_DIALOG';
const category = (id, extra = {}) => ({
  id,
  name: `Cat ${id}`,
  icon: 'i',
  icon_color: '#fff',
  meta: { articles_count: 4 },
  ...extra,
});
const article = (id, categoryName) => ({
  id,
  title: `Art ${id}`,
  category: categoryName ? { name: categoryName } : null,
});

const portal = (popular = {}) => ({
  slug: 'docs',
  config: { popular_content: popular },
});

const mountDialog = (props = { portal: portal() }) =>
  mount(PopularContentDialog, {
    props,
    global: { stubs: { Dialog, ReorderableMultiSelect: Picker } },
  });

const pickers = wrapper => wrapper.findAllComponents(Picker);
const alerts = () => env.alert.mock.calls.map(c => c[0]);

describe('PopularContentDialog behaviour', () => {
  beforeEach(() => {
    env.alert = vi.fn();
    env.open = vi.fn();
    env.close = vi.fn();
    env.dispatch = vi.fn(() => Promise.resolve());
    env.getCategories = vi.fn(() =>
      Promise.resolve({
        data: { payload: [category(1), category(2, { meta: undefined })] },
      })
    );
    env.getArticles = vi.fn(() =>
      Promise.resolve({
        data: { payload: [article(10, 'Billing'), article(11)] },
      })
    );
    env.getArticle = vi.fn(({ id }) =>
      Promise.resolve({ data: { payload: article(id, 'Old') } })
    );
  });

  it('opens for a locale with its saved picks and loads options', async () => {
    const wrapper = mountDialog({
      portal: portal({ en: { category_ids: [2], article_ids: [99, 10] } }),
    });
    wrapper.vm.openForLocale('en');
    expect(env.open).toHaveBeenCalled();
    await flushPromises();
    expect(env.getCategories).toHaveBeenCalledWith({
      portalSlug: 'docs',
      locale: 'en',
    });
    expect(pickers(wrapper)[0].props()).toMatchObject({
      modelValue: [2],
      max: 3,
      loading: false,
      options: [
        {
          value: 1,
          label: 'Cat 1',
          subtitle: `${KEY}.CATEGORIES.ARTICLES_COUNT`,
          icon: 'i',
          iconColor: '#fff',
        },
        expect.objectContaining({ value: 2 }),
      ],
    });
    expect(env.getArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNumber: 1,
        portalSlug: 'docs',
        locale: 'en',
        status: 'published',
        query: '',
      })
    );
    // Reopening clears the option cache, so every saved article is looked up.
    expect(env.getArticle).toHaveBeenCalledWith({ id: 99, portalSlug: 'docs' });
    expect(env.getArticle).toHaveBeenCalledWith({ id: 10, portalSlug: 'docs' });
    expect(pickers(wrapper)[1].props()).toMatchObject({
      modelValue: [99, 10],
      max: 6,
      loading: false,
    });
    expect(
      pickers(wrapper)[1]
        .props('options')
        .map(o => o.value)
    ).toEqual([99, 10, 11]);
    expect(pickers(wrapper)[1].props('options')[2].subtitle).toBe(
      `${KEY}.ARTICLES.IN_CATEGORY`
    );
    expect(wrapper.text()).toContain(`${KEY}.SLOTS_LEFT`);
    expect(wrapper.text()).toContain(`${KEY}.OVERRIDING_DEFAULTS`);
  });

  it('leaves deleted saved articles to the id fallback', async () => {
    env.getArticle = vi.fn(() => Promise.reject(new Error('404')));
    const wrapper = mountDialog({
      portal: portal({ en: { article_ids: [99] } }),
    });
    wrapper.vm.openForLocale('en');
    await flushPromises();
    expect(
      pickers(wrapper)[1]
        .props('options')
        .map(o => o.value)
    ).toEqual([10, 11]);
    expect(alerts()).toEqual([]);
  });

  it('opens a locale with nothing saved, without a portal', async () => {
    const wrapper = mountDialog({});
    wrapper.vm.openForLocale('fr');
    await flushPromises();
    expect(env.getCategories).toHaveBeenCalledWith({
      portalSlug: undefined,
      locale: 'fr',
    });
    expect(pickers(wrapper)[0].props('modelValue')).toEqual([]);
    expect(pickers(wrapper)[1].props('modelValue')).toEqual([]);
  });

  it('drops categories that arrive for a previous locale', async () => {
    const pending = {};
    env.getCategories = vi.fn(
      ({ locale }) =>
        new Promise((resolve, reject) => {
          pending[locale] = { resolve, reject };
        })
    );
    const wrapper = mountDialog();
    wrapper.vm.openForLocale('en');
    wrapper.vm.openForLocale('fr');
    pending.en.resolve({ data: { payload: [category(1)] } });
    await flushPromises();
    expect(pickers(wrapper)[0].props('options')).toEqual([]);
    expect(pickers(wrapper)[0].props('loading')).toBe(true);
    pending.fr.resolve({ data: { payload: [category(3)] } });
    await flushPromises();
    expect(
      pickers(wrapper)[0]
        .props('options')
        .map(o => o.value)
    ).toEqual([3]);
    expect(pickers(wrapper)[0].props('loading')).toBe(false);

    // A failure for a previous locale also leaves the loading flag alone.
    wrapper.vm.openForLocale('de');
    wrapper.vm.openForLocale('es');
    pending.de.reject(new Error('old'));
    await flushPromises();
    expect(pickers(wrapper)[0].props('loading')).toBe(true);
  });

  it('alerts when categories or articles fail to load', async () => {
    env.getCategories = vi.fn(() =>
      Promise.reject(new Error('Categories down'))
    );
    env.getArticles = vi.fn(() => Promise.reject(new Error()));
    const wrapper = mountDialog();
    wrapper.vm.openForLocale('en');
    await flushPromises();
    expect(alerts()).toEqual(['Categories down', `${KEY}.API.ERROR_MESSAGE`]);
    expect(pickers(wrapper)[0].props('loading')).toBe(false);

    env.getCategories = vi.fn(() => Promise.reject(new Error()));
    env.getArticles = vi.fn(() => Promise.reject(new Error('Articles down')));
    wrapper.vm.openForLocale('en');
    await flushPromises();
    expect(alerts()).toContain('Articles down');
  });

  it('searches articles and keeps selected ones as options', async () => {
    const wrapper = mountDialog();
    wrapper.vm.openForLocale('en');
    await flushPromises();
    pickers(wrapper)[1].vm.$emit('update:modelValue', [10]);
    env.getArticles = vi.fn(() =>
      Promise.resolve({ data: { payload: [article(12, 'Docs')] } })
    );
    pickers(wrapper)[1].vm.$emit('search', 'refund');
    await flushPromises();
    expect(env.getArticles).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'refund', locale: 'en' })
    );
    expect(
      pickers(wrapper)[1]
        .props('options')
        .map(o => o.value)
    ).toEqual([10, 12]);
    // Searching with no query lists everything again.
    pickers(wrapper)[1].vm.$emit('search');
    await flushPromises();
    expect(env.getArticles).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: '' })
    );
  });

  it('saves the picks for the locale and closes', async () => {
    const wrapper = mountDialog({
      portal: portal({ fr: { category_ids: [5] } }),
    });
    wrapper.vm.openForLocale('en');
    await flushPromises();
    pickers(wrapper)[0].vm.$emit('update:modelValue', [1]);
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(env.dispatch).toHaveBeenCalledWith('portals/update', {
      portalSlug: 'docs',
      config: {
        popular_content: {
          fr: { category_ids: [5] },
          en: { category_ids: [1], article_ids: [] },
        },
      },
    });
    expect(env.close).toHaveBeenCalled();
    expect(alerts()).toContain(`${KEY}.API.SUCCESS_MESSAGE`);
  });

  it('removes the locale entry when everything is cleared', async () => {
    const wrapper = mountDialog({
      portal: portal({ en: { article_ids: [10] }, fr: { category_ids: [5] } }),
    });
    wrapper.vm.openForLocale('en');
    await flushPromises();
    pickers(wrapper)[1].vm.$emit('update:modelValue', []);
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(env.dispatch.mock.calls[0][1].config.popular_content).toEqual({
      fr: { category_ids: [5] },
    });

    // Only articles picked still saves the entry.
    pickers(wrapper)[1].vm.$emit('update:modelValue', [11]);
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(env.dispatch.mock.calls[1][1].config.popular_content.en).toEqual({
      category_ids: [],
      article_ids: [11],
    });
  });

  it('alerts when saving fails', async () => {
    const wrapper = mountDialog();
    wrapper.vm.openForLocale('en');
    await flushPromises();
    env.dispatch = vi.fn(() => Promise.reject(new Error('Nope')));
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(alerts()).toContain('Nope');
    env.dispatch = vi.fn(() => Promise.reject(new Error()));
    wrapper.findComponent(Dialog).vm.$emit('confirm');
    await flushPromises();
    expect(alerts()).toContain(`${KEY}.API.ERROR_MESSAGE`);
    expect(env.close).not.toHaveBeenCalled();
  });
});
