/**
 * OneTeam behaviour spec for portal search suggestions.
 *
 * Covers keyboard navigation wiring (the items list, active row class and
 * scroll adjustment), the loading text and the empty state.
 */
import { mount, flushPromises } from '@vue/test-utils';
import SearchSuggestions from '../SearchSuggestions.vue';

const env = vi.hoisted(() => ({ nav: null }));

vi.mock('dashboard/composables/useKeyboardNavigableList', () => ({
  useKeyboardNavigableList: options => {
    env.nav = options;
  },
}));

const global = { directives: { dompurifyHtml: {} } };

describe('SearchSuggestions behaviour', () => {
  it('wires keyboard navigation to the list', async () => {
    const items = [
      { id: 1, title: 'Billing', content: 'Pay', link: '/a/1' },
      { id: 2, title: 'Refunds', content: 'Back', link: '/a/2' },
    ];
    const wrapper = mount(SearchSuggestions, {
      props: { items, searchTerm: 'b' },
      global,
    });
    expect(env.nav.items.value).toEqual(items);
    env.nav.selectedIndex.value = 1;
    env.nav.adjustScroll();
    await flushPromises();
    expect(wrapper.element.scrollTop).toBe(102);
    expect(wrapper.findAll('li')[1].classes()).toContain('bg-n-portal-soft');
    expect(wrapper.findAll('li')[0].classes()).not.toContain(
      'bg-n-portal-soft'
    );
  });

  it('shows the loading text and the empty state', () => {
    const loading = mount(SearchSuggestions, {
      props: { isLoading: true, loadingPlaceholder: 'Searching' },
      global,
    });
    expect(loading.text()).toBe('Searching');
    const empty = mount(SearchSuggestions, {
      props: { emptyPlaceholder: 'No results' },
      global,
    });
    expect(empty.text()).toBe('No results');
  });
});
