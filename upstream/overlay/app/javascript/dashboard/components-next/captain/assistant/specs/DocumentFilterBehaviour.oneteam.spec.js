/**
 * OneTeam behaviour spec for the Captain documents filter.
 *
 * Covers the default filters and request params, choosing a source
 * (clearing the crawl status unless it is "web"), choosing a status
 * (switching the source to web), sorting, the active-filter flag, the
 * change event, and resetting.
 */
import { mount } from '@vue/test-utils';
import DocumentFilter from '../DocumentFilter.vue';

const Bar = {
  name: 'DocumentFiltersBar',
  props: ['activeSourceFilter', 'activeStatusFilter', 'activeSort'],
  emits: ['selectSource', 'selectStatus', 'selectSort'],
  template: '<div class="bar" />',
};

const mountFilter = () =>
  mount(DocumentFilter, { global: { stubs: { DocumentFiltersBar: Bar } } });

describe('DocumentFilter behaviour', () => {
  it('starts with all documents sorted by update time', () => {
    const wrapper = mountFilter();
    expect(wrapper.findComponent(Bar).props()).toEqual({
      activeSourceFilter: 'all',
      activeStatusFilter: null,
      activeSort: 'recently_updated',
    });
    expect(wrapper.vm.hasActiveFilters).toBe(false);
    expect(wrapper.vm.buildParams()).toEqual({
      page: 1,
      sort: 'recently_updated',
    });
  });

  it('filters by source, status and sort', async () => {
    const wrapper = mountFilter();
    const bar = wrapper.findComponent(Bar);
    await bar.vm.$emit('selectStatus', 'failed');
    expect(bar.props('activeSourceFilter')).toBe('web');
    expect(wrapper.vm.hasActiveFilters).toBe(true);
    expect(wrapper.vm.buildParams(3)).toEqual({
      page: 3,
      source: 'web',
      filter: 'failed',
      sort: 'recently_updated',
    });

    await bar.vm.$emit('selectSource', 'web');
    expect(bar.props('activeStatusFilter')).toBe('failed');
    await bar.vm.$emit('selectSource', 'pdf');
    expect(bar.props('activeStatusFilter')).toBe(null);

    await bar.vm.$emit('selectStatus', null);
    expect(bar.props('activeSourceFilter')).toBe('pdf');

    await bar.vm.$emit('selectSort', '');
    expect(wrapper.vm.buildParams()).toEqual({ page: 1, source: 'pdf' });
    expect(wrapper.emitted('change')).toHaveLength(5);

    wrapper.vm.reset();
    await wrapper.vm.$nextTick();
    expect(bar.props()).toEqual({
      activeSourceFilter: 'all',
      activeStatusFilter: null,
      activeSort: 'recently_updated',
    });
  });
});
