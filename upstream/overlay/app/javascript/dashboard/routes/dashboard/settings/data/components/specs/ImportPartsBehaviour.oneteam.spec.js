/**
 * OneTeam behaviour spec for data import progress and summary tiles.
 *
 * Covers the progress grid width for one or two groups, totals and
 * percentages, and the summary tiles' type labels, duration and initiator
 * fallbacks.
 */
import { mount } from '@vue/test-utils';
import ImportProgress from '../ImportProgress.vue';
import ImportSummaryTiles from '../ImportSummaryTiles.vue';

const mountProgress = dataImport =>
  mount(ImportProgress, { props: { dataImport, title: 'Progress' } });

describe('ImportProgress', () => {
  it('uses two columns for conversations and shows percentages', () => {
    const wrapper = mountProgress({
      import_types: ['conversations'],
      stats: { conversations: { imported: 5, total: 10 } },
    });
    expect(wrapper.find('.sm\\:grid-cols-2').exists()).toBe(true);
    expect(wrapper.text()).toContain('50%');
  });

  it('uses one column for a single group', () => {
    const wrapper = mountProgress({ import_types: ['contacts'] });
    expect(wrapper.find('.sm\\:grid-cols-1').exists()).toBe(true);
    expect(wrapper.text()).toContain('DATA_IMPORTS.DETAIL.PROGRESS_IMPORTED');
  });
});

const values = dataImport =>
  mount(ImportSummaryTiles, {
    props: { dataImport },
    global: { directives: { tooltip: {} }, stubs: { Icon: true } },
  })
    .findAll('dd')
    .map(dd => dd.text());

describe('ImportSummaryTiles', () => {
  it('labels conversation and unknown import types', () => {
    const [, types, , duration, initiator] = values({
      import_types: ['conversations', 'tickets'],
      created_at: '2026-11-01T00:00:00Z',
      completed_at: '2026-11-01T00:05:00Z',
      initiated_by: { email: 'ann@example.test' },
    });
    expect(types).toBe('DATA_IMPORTS.TYPES.CONVERSATIONS, tickets');
    expect(duration).toBe('5 minutes');
    expect(initiator).toBe('ann@example.test');
  });

  it('falls back when nothing is known', () => {
    const [, types, , duration, initiator] = values({});
    expect(types).toBe('-');
    expect(duration).toBe('-');
    expect(initiator).toBe('-');
  });
});
