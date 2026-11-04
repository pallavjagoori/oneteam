/**
 * OneTeam behaviour spec for the contacts list layout.
 *
 * Covers the search and filter preview per route, relaying header
 * events, opening filters from the preview, infinite scroll load more,
 * and pagination.
 */
import { mount } from '@vue/test-utils';
import ContactsListLayout from '../ContactsListLayout.vue';

const env = vi.hoisted(() => ({ route: { name: 'contacts_dashboard_index' } }));
const toggleFilters = vi.fn();

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => env.route,
}));

/**
 * Mounts the layout.
 *
 * @param {object} props component props
 * @returns {import('@vue/test-utils').VueWrapper}
 */
const mountLayout = props =>
  mount(ContactsListLayout, {
    props,
    slots: { default: '<p class="rows" />' },
    global: {
      stubs: {
        ContactListHeaderWrapper: {
          name: 'ContactListHeaderWrapper',
          props: ['showSearch', 'isLabelView', 'isActiveView'],
          emits: ['update:sort', 'search', 'applyFilter', 'clearFilters'],
          methods: { onToggleFilters: () => toggleFilters() },
          template: '<header />',
        },
        ContactsActiveFiltersPreview: {
          name: 'ContactsActiveFiltersPreview',
          emits: ['clearFilters', 'openFilter'],
          template: '<div class="preview" />',
        },
        ContactsLoadMore: {
          name: 'ContactsLoadMore',
          emits: ['loadMore'],
          template: '<div class="more" />',
        },
        PaginationFooter: {
          name: 'PaginationFooter',
          emits: ['update:currentPage'],
          template: '<nav />',
        },
      },
    },
  });

describe('ContactsListLayout behaviour', () => {
  it('relays header, preview and pagination events', () => {
    env.route = { name: 'contacts_dashboard_index' };
    const wrapper = mountLayout({ hasAppliedFilters: true });
    const header = wrapper.findComponent({ name: 'ContactListHeaderWrapper' });
    expect(header.props('showSearch')).toBe(true);
    header.vm.$emit('update:sort', 'name');
    header.vm.$emit('search', 'amy');
    header.vm.$emit('applyFilter', [1]);
    header.vm.$emit('clearFilters');
    const preview = wrapper.findComponent({
      name: 'ContactsActiveFiltersPreview',
    });
    preview.vm.$emit('clearFilters');
    preview.vm.$emit('openFilter');
    expect(toggleFilters).toHaveBeenCalled();
    wrapper
      .findComponent({ name: 'PaginationFooter' })
      .vm.$emit('update:currentPage', 3);
    expect(wrapper.emitted()).toMatchObject({
      'update:sort': [['name']],
      search: [['amy']],
      applyFilter: [[[1]]],
      clearFilters: [[], []],
      'update:currentPage': [[3]],
    });
    expect(wrapper.find('.more').exists()).toBe(false);
  });

  it('shows load more instead of pagination with infinite scroll', () => {
    env.route = { name: 'contacts_dashboard_segments_index' };
    const wrapper = mountLayout({ useInfiniteScroll: true, hasMore: true });
    expect(wrapper.find('nav').exists()).toBe(false);
    expect(wrapper.find('.preview').exists()).toBe(true);
    expect(
      wrapper
        .findComponent({ name: 'ContactListHeaderWrapper' })
        .props('showSearch')
    ).toBe(false);
    wrapper.findComponent({ name: 'ContactsLoadMore' }).vm.$emit('loadMore');
    expect(wrapper.emitted('loadMore')).toHaveLength(1);
  });

  it.each([
    ['contacts_dashboard_labels_index', { hasAppliedFilters: true }],
    ['contacts_dashboard_active', { hasAppliedFilters: true }],
    [
      'contacts_dashboard_index',
      { hasAppliedFilters: true, isFetchingList: true },
    ],
    ['contacts_dashboard_index', { showPaginationFooter: false }],
  ])('hides the filter preview on %s', (name, props) => {
    env.route = { name };
    const wrapper = mountLayout(props);
    expect(wrapper.find('.preview').exists()).toBe(false);
  });
});
