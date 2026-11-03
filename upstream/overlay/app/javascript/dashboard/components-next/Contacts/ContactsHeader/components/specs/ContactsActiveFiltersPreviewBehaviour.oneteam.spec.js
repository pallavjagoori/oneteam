/**
 * OneTeam behaviour spec for the contacts active filter preview.
 *
 * Covers showing the applied filters with a clear button, showing a
 * segment's saved query (camel-cased, default "and" operator) without
 * one, ignoring a malformed segment query, segment id 0, and forwarding
 * open and clear events.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import ContactsActiveFiltersPreview from '../ContactsActiveFiltersPreview.vue';

const route = vi.hoisted(() => ({ params: {} }));
const applied = ref([{ attributeKey: 'name' }]);

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => route,
}));
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => applied,
}));

const Preview = {
  name: 'ActiveFilterPreview',
  props: ['appliedFilters', 'showClearButton'],
  emits: ['openFilter', 'clearFilters'],
  template: '<div />',
};
const mountPreview = activeSegment =>
  mount(ContactsActiveFiltersPreview, {
    props: { activeSegment },
    global: { stubs: { ActiveFilterPreview: Preview } },
  });

describe('ContactsActiveFiltersPreview behaviour', () => {
  it('shows applied filters and forwards events', () => {
    route.params = {};
    const wrapper = mountPreview(null);
    const preview = wrapper.findComponent(Preview);
    expect(preview.props()).toEqual({
      appliedFilters: applied.value,
      showClearButton: true,
    });
    preview.vm.$emit('openFilter');
    preview.vm.$emit('clearFilters');
    expect(wrapper.emitted('openFilter')).toHaveLength(1);
    expect(wrapper.emitted('clearFilters')).toHaveLength(1);
  });

  it('shows a segment query', () => {
    route.params = { segmentId: '3' };
    const wrapper = mountPreview({
      query: {
        payload: [
          {
            attribute_key: 'city',
            attribute_model: 'standard',
            filter_operator: 'equal_to',
            values: ['Pune'],
          },
          { attribute_key: 'plan', query_operator: 'or', values: [] },
        ],
      },
    });
    const preview = wrapper.findComponent(Preview);
    expect(preview.props('showClearButton')).toBe(false);
    expect(preview.props('appliedFilters')).toEqual([
      {
        attributeKey: 'city',
        attributeModel: 'standard',
        customAttributeType: undefined,
        filterOperator: 'equal_to',
        queryOperator: 'and',
        values: ['Pune'],
      },
      {
        attributeKey: 'plan',
        attributeModel: undefined,
        customAttributeType: undefined,
        filterOperator: undefined,
        queryOperator: 'or',
        values: [],
      },
    ]);
    expect(
      mountPreview({ query: {} }).findComponent(Preview).props('appliedFilters')
    ).toEqual([]);
  });

  it('treats segment id 0 as no segment', () => {
    route.params = { segmentId: 0 };
    const preview = mountPreview({ query: {} }).findComponent(Preview);
    expect(preview.props('showClearButton')).toBe(true);
  });
});
