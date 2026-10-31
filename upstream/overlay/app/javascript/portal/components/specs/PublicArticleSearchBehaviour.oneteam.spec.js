/**
 * OneTeam behaviour spec for the public help center article search.
 *
 * Covers debounced searching (results, failures, blank and whitespace
 * terms), showing and hiding suggestions (focus, hover, click-away), the
 * ⌘K / Ctrl K shortcut and Escape, submitting to the search page with
 * theme and plain-layout params, and the input and blur events.
 */
import { mount, flushPromises } from '@vue/test-utils';
import ArticlesAPI from '../../api/article';
import PublicArticleSearch from '../PublicArticleSearch.vue';

const env = vi.hoisted(() => ({ clickaway: null, log: [] }));

vi.mock('../../api/article', () => ({ default: { searchArticles: vi.fn() } }));

const SearchInput = {
  name: 'PublicSearchInput',
  props: ['searchTerm', 'searchPlaceholder', 'kbd', 'size'],
  emits: ['update:searchTerm', 'focus'],
  methods: {
    focusInput: () => env.log.push('focus'),
    blurInput: () => env.log.push('blur'),
  },
  template: '<input class="search" :placeholder="searchPlaceholder" />',
};
const Suggestions = {
  name: 'SearchSuggestions',
  props: ['items', 'isLoading', 'searchTerm', 'emptyPlaceholder'],
  template: '<div class="suggestions" />',
};

let originalLocation;
beforeAll(() => {
  originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '' },
  });
});
afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});

const mountSearch = (props = {}) =>
  mount(PublicArticleSearch, {
    props,
    global: {
      stubs: { PublicSearchInput: SearchInput, SearchSuggestions: Suggestions },
      directives: {
        onClickaway: {
          mounted: (el, b) => {
            env.clickaway = b.value;
          },
        },
      },
    },
  });
const input = wrapper => wrapper.findComponent(SearchInput);
const suggestions = wrapper => wrapper.findComponent(Suggestions);
const type = (wrapper, value) =>
  input(wrapper).vm.$emit('update:searchTerm', value);

describe('PublicArticleSearch behaviour', () => {
  let wrapper;
  beforeEach(() => {
    vi.useFakeTimers();
    env.log = [];
    window.portalConfig = {
      portalSlug: 'docs',
      localeCode: 'en',
      searchTranslations: {
        searchPlaceholder: 'Search docs',
        emptyPlaceholder: 'Nothing',
      },
    };
    window.location.href = '';
    ArticlesAPI.searchArticles.mockResolvedValue({
      data: { payload: [{ id: 1 }] },
    });
  });
  afterEach(() => {
    wrapper?.unmount();
    vi.useRealTimers();
  });

  it('searches after typing pauses', async () => {
    wrapper = mountSearch();
    expect(input(wrapper).props('searchPlaceholder')).toBe('Search docs');
    expect(input(wrapper).props('kbd')).toBe('');
    await type(wrapper, 'ref');
    await type(wrapper, ' refund ');
    expect(suggestions(wrapper).props('isLoading')).toBe(true);
    expect(suggestions(wrapper).props('searchTerm')).toBe('refund');
    vi.advanceTimersByTime(1000);
    await flushPromises();
    expect(ArticlesAPI.searchArticles).toHaveBeenCalledTimes(1);
    expect(ArticlesAPI.searchArticles).toHaveBeenCalledWith(
      'docs',
      'en',
      'refund'
    );
    expect(suggestions(wrapper).props('items')).toEqual([{ id: 1 }]);
    expect(suggestions(wrapper).props('isLoading')).toBe(false);
  });

  it('closes suggestions for blank terms and survives failures', async () => {
    window.portalConfig.searchTranslations = undefined;
    wrapper = mountSearch();
    await type(wrapper, 'x');
    await type(wrapper, '   ');
    expect(suggestions(wrapper).exists()).toBe(false);
    ArticlesAPI.searchArticles.mockRejectedValueOnce(new Error('offline'));
    await type(wrapper, 'x');
    vi.advanceTimersByTime(1000);
    await flushPromises();
    expect(suggestions(wrapper).props('items')).toEqual([]);
    expect(suggestions(wrapper).props('isLoading')).toBe(false);
  });

  it('skips fetching when the term was cleared', async () => {
    wrapper = mountSearch();
    wrapper.vm.isLoading = true;
    await wrapper.vm.fetchArticlesByQuery();
    expect(ArticlesAPI.searchArticles).not.toHaveBeenCalled();
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('shows suggestions on focus or hover and hides them on click-away', async () => {
    wrapper = mountSearch();
    await type(wrapper, 'x');
    env.clickaway();
    await flushPromises();
    expect(suggestions(wrapper).exists()).toBe(false);
    await input(wrapper).vm.$emit('focus');
    expect(suggestions(wrapper).exists()).toBe(true);
    wrapper.vm.closeSearch();
    wrapper.vm.openSearch();
    await flushPromises();
    await wrapper.find('.absolute').trigger('mouseover');
    expect(suggestions(wrapper).exists()).toBe(true);
    wrapper.vm.clearSearchTerm();
    await flushPromises();
    expect(suggestions(wrapper).exists()).toBe(false);
  });

  it('handles the keyboard shortcut and escape', async () => {
    const platform = vi
      .spyOn(navigator, 'platform', 'get')
      .mockReturnValue('MacIntel');
    wrapper = mountSearch({ showKbd: true });
    expect(input(wrapper).props('kbd')).toBe('⌘ K');
    await type(wrapper, 'x');
    const press = init => {
      const event = new KeyboardEvent('keydown', { ...init, cancelable: true });
      document.dispatchEvent(event);
      return event;
    };
    expect(press({ key: 'k', metaKey: true }).defaultPrevented).toBe(true);
    press({ key: 'K', ctrlKey: true });
    press({ key: 'k' });
    press({ key: 'Escape' });
    await flushPromises();
    expect(env.log).toEqual(['focus', 'focus', 'blur']);
    expect(suggestions(wrapper).exists()).toBe(false);

    Object.defineProperty(wrapper.vm.$refs, 'searchInput', {
      value: null,
      configurable: true,
    });
    press({ key: 'k', metaKey: true });
    press({ key: 'Escape' });
    expect(env.log).toHaveLength(3);
    wrapper.unmount();
    press({ key: 'k', metaKey: true });
    expect(env.log).toHaveLength(3);
    wrapper = null;

    platform.mockReturnValue('Win32');
    wrapper = mountSearch({ showKbd: true });
    expect(input(wrapper).props('kbd')).toBe('Ctrl K');
  });

  it('submits to the search page with layout params', async () => {
    wrapper = mountSearch();
    await wrapper.find('form').trigger('submit');
    expect(window.location.href).toBe('');
    await type(wrapper, ' billing ');
    await wrapper.find('form').trigger('submit');
    expect(window.location.href).toBe('/hc/docs/en/search?query=billing');
    window.portalConfig.theme = 'dark';
    window.portalConfig.isPlainLayoutEnabled = 'true';
    await wrapper.find('form').trigger('submit');
    expect(window.location.href).toBe(
      '/hc/docs/en/search?query=billing&theme=dark&show_plain_layout=true'
    );
  });

  it('re-emits input and blur values', () => {
    wrapper = mountSearch();
    wrapper.vm.onChange({ target: { value: 'a' } });
    wrapper.vm.onBlur({ target: { value: 'b' } });
    expect(wrapper.emitted('input')).toEqual([['a']]);
    expect(wrapper.emitted('blur')).toEqual([['b']]);
  });
});
