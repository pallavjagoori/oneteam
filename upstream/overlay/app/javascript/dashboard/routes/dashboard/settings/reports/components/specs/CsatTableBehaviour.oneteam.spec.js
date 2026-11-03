/**
 * OneTeam behaviour spec for the CSAT responses table.
 *
 * Covers the loader, the empty state, rows with ratings, feedback and the
 * handling agent (and their fallbacks), expandable review rows when the
 * notes feature or Chatwoot Cloud is on, plain rows otherwise, and paging.
 */
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import CsatTable from '../CsatTable.vue';

const env = vi.hoisted(() => ({
  responses: [],
  flags: {},
  metrics: {},
  feature: false,
  cloud: false,
}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: name =>
    ref(
      {
        'csat/getCSATResponses': env.responses,
        'csat/getUIFlags': env.flags,
        'csat/getMetrics': env.metrics,
      }[name]
    ),
}));
vi.mock('dashboard/composables/useAccount', async () => {
  const { ref: appRef } = await import('vue');
  return {
    useAccount: () => ({
      isCloudFeatureEnabled: () => env.feature,
      isOnChatwootCloud: appRef(env.cloud),
    }),
  };
});
vi.mock('shared/helpers/timeHelper', () => ({
  dynamicTime: () => 'ago',
  messageStamp: () => 'stamp',
}));

const Pagination = {
  name: 'Pagination',
  props: ['table'],
  template: '<nav @click="table.setPageIndex(2)" />',
};
const response = {
  id: 1,
  rating: 5,
  feedback_message: 'Great',
  assigned_agent: { id: 2, name: 'Sam' },
  contact: { id: 3 },
  conversation_id: 9,
  created_at: 1,
};

const mountTable = () =>
  mount(CsatTable, {
    props: { pageIndex: 1 },
    global: {
      stubs: {
        Pagination,
        CsatTableLoader: { template: '<p class="loader" />' },
        CsatEmptyState: { template: '<p class="empty" />' },
        CsatContactCell: true,
        ShowMore: { props: ['text'], template: '<span>{{ text }}</span>' },
        UserAvatarWithName: {
          props: ['user'],
          template: '<b>{{ user.name }}</b>',
        },
        CsatExpandedRow: { template: '<div class="expanded" />' },
      },
    },
  });

describe('CsatTable behaviour', () => {
  beforeEach(() => {
    env.responses = [];
    env.flags = {};
    env.metrics = {};
    env.feature = false;
    env.cloud = false;
  });

  it('shows the loader and the empty state', () => {
    env.flags = { isFetching: true };
    expect(mountTable().find('.loader').exists()).toBe(true);
    env.flags = {};
    const empty = mountTable();
    expect(empty.find('.empty').exists()).toBe(true);
    expect(empty.find('nav').exists()).toBe(false);
  });

  it('lists plain rows and pages', async () => {
    env.responses = [
      response,
      {
        ...response,
        id: 2,
        rating: 1,
        feedback_message: null,
        assigned_agent: null,
      },
    ];
    env.metrics = { totalResponseCount: 60 };
    const wrapper = mountTable();
    expect(wrapper.findAll('th')).toHaveLength(4);
    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].text()).toContain('Great');
    expect(rows[0].text()).toContain('Sam');
    expect(rows[1].text()).toContain('CSAT_REPORTS.NO_FEEDBACK');
    expect(rows[1].text()).toContain('CSAT_REPORTS.NO_AGENT');
    await rows[0].trigger('click');
    expect(wrapper.find('.expanded').exists()).toBe(false);
    expect(wrapper.vm.getRatingData(99)).toEqual({});

    const { table } = wrapper.findComponent({ name: 'Pagination' }).props();
    expect(table.getState().pagination).toEqual({ pageIndex: 1, pageSize: 25 });
    await wrapper.find('nav').trigger('click');
    expect(wrapper.emitted('pageChange')).toEqual([[2]]);
  });

  it('expands review rows with notes or on Cloud', async () => {
    env.responses = [response];
    env.feature = true;
    const wrapper = mountTable();
    expect(wrapper.findAll('th')).toHaveLength(5);
    const row = wrapper.find('tbody tr');
    expect(row.find('.i-lucide-chevron-down').exists()).toBe(true);
    await row.trigger('click');
    expect(wrapper.find('.expanded').exists()).toBe(true);
    expect(row.find('.i-lucide-chevron-up').exists()).toBe(true);
    await row.trigger('click');
    expect(wrapper.find('.expanded').exists()).toBe(false);

    env.feature = false;
    env.cloud = true;
    expect(mountTable().findAll('th')).toHaveLength(5);
  });
});
