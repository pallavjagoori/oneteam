/**
 * OneTeam behaviour spec for the Captain overview v2 knowledge card.
 *
 * Covers the approved and suggested counts, the coverage progress bar,
 * the loading state, missing stats, and the review action.
 */
import { mount } from '@vue/test-utils';
import KnowledgeCoverageCard from '../KnowledgeCoverageCard.vue';

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal()),
  useI18n: () => ({ t: key => key }),
}));

const OverviewPanel = {
  name: 'OverviewPanel',
  props: ['title'],
  template: '<section><slot name="actions" /><slot /></section>',
};
const ProgressMetric = {
  name: 'ProgressMetric',
  props: ['used', 'total', 'usageLabel', 'valueLabel', 'loading'],
  template: '<div />',
};
const Button = {
  name: 'NextButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')" />',
};

/**
 * Mounts the card.
 *
 * @param {object} props Card props.
 * @returns {import('@vue/test-utils').VueWrapper} The mounted wrapper.
 */
const mountCard = props =>
  mount(KnowledgeCoverageCard, {
    props,
    global: {
      stubs: { OverviewPanel, ProgressMetric, Button },
      mocks: {
        $t: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
      },
    },
  });

describe('KnowledgeCoverageCard behaviour', () => {
  it('shows coverage and counts and asks for review', async () => {
    const wrapper = mountCard({
      knowledge: { approved: 1200, suggestions: 300, coverage: 80 },
      loading: true,
    });
    const metric = wrapper.getComponent(ProgressMetric);
    expect(metric.props()).toMatchObject({
      used: 1200,
      total: 1500,
      loading: true,
    });
    expect(metric.props('usageLabel')).toContain('"pct":80');
    expect(metric.props('valueLabel')).toContain('"used":"1,200"');
    expect(wrapper.text()).toContain('1,200');
    expect(wrapper.text()).toContain('300');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('review')).toHaveLength(1);
  });

  it('treats missing stats as zero', () => {
    const metric = mountCard({}).getComponent(ProgressMetric);
    expect(metric.props()).toMatchObject({ used: 0, total: 0 });
    expect(metric.props('usageLabel')).toContain('"pct":0');
  });
});
